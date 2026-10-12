"""Generate low-poly props for the game with Blender primitives and export one .glb each.

Run (from the project root):
  flatpak run org.blender.Blender -b --python tools/blender/make_props.py -- assets/generated/props

(or `bun run make-props`). Files land in assets/generated/props/<name>.glb and are copied to
public/models/props by scripts/sync-assets.mjs (see ASSET_SOURCES in scripts/asset-map.mjs).

Conventions: build each prop sitting on z = 0, centred on the origin, about 1-2 units tall
(characters are ~2.2 units tall). Blender's Z-up is converted to glTF Y-up by the exporter,
so props stand up correctly in three.js. Faces stay flat-shaded (no smooth shading) for the
low-poly look. Colours are plain PBR base colours; glows use emission.
"""
import math
import os
import sys

import bpy

argv = sys.argv[sys.argv.index('--') + 1:]
OUT = argv[0]

# (r, g, b) helper colours, 0..1
STONE = (0.42, 0.40, 0.38)
STONE_DARK = (0.30, 0.28, 0.27)
DIRT = (0.45, 0.33, 0.22)
WOOD = (0.52, 0.35, 0.18)
WOOD_DARK = (0.38, 0.25, 0.12)
STRAW = (0.85, 0.68, 0.30)
BONE = (0.90, 0.86, 0.74)
IRON = (0.24, 0.24, 0.26)
CRYSTAL_BLUE = (0.45, 0.75, 0.95)
CRYSTAL_GLOW = (0.30, 0.55, 0.85)
GOLD = (0.95, 0.75, 0.25)
LEAF = (0.35, 0.55, 0.25)


def mat(name, color, rough=0.8, metal=0.0, emit=None, emit_strength=1.0, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if alpha < 1.0:
        bsdf.inputs['Alpha'].default_value = alpha
        m.blend_method = 'BLEND'
    if emit is not None:
        bsdf.inputs['Emission Color'].default_value = (*emit, 1.0)
        bsdf.inputs['Emission Strength'].default_value = emit_strength
    return m


def put(obj, m, loc, rot=(0, 0, 0), scale=(1, 1, 1)):
    obj.data.materials.append(m)
    obj.location = loc
    obj.rotation_euler = tuple(math.radians(a) for a in rot)
    obj.scale = scale
    return obj


def box(m, size, loc, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add()
    o = bpy.context.active_object
    o.scale = tuple(s / 2 for s in size)
    bpy.ops.object.transform_apply(scale=True)  # bake so child exporters keep clean transforms
    return put(o, m, loc, rot)


def cyl(m, r, depth, loc, rot=(0, 0, 0), verts=10):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, vertices=verts)
    return put(bpy.context.active_object, m, loc, rot)


def cone(m, r, depth, loc, rot=(0, 0, 0), verts=6):
    bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=0, depth=depth, vertices=verts)
    return put(bpy.context.active_object, m, loc, rot)


def ball(m, r, loc, subdiv=1):
    bpy.ops.mesh.primitive_ico_sphere_add(radius=r, subdivisions=subdiv)
    return put(bpy.context.active_object, m, loc)


def torus(m, major, minor, loc, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor)
    return put(bpy.context.active_object, m, loc, rot)


# --------------------------------------------------------------- the props

def stalagmite(mats):
    r = mats['rock']
    d = mats['rockdark']
    g = bpy.data.objects.new('stalagmite', None)
    bpy.context.collection.objects.link(g)
    parts = [
        (0.0, 0.0, 0.30, 1.6),      # main spike
        (0.28, 0.12, 0.20, 0.9),    # companion spikes
        (-0.22, -0.08, 0.16, 0.7),
        (0.10, -0.20, 0.12, 0.5),
    ]
    for x, y, rr, h in parts:
        cone(r, rr, h, (x, y, h / 2 - 0.05), verts=5)
        ball(d, rr * 0.5, (x, y, 0.08))   # a rubble stone at the foot
    return g


def crystalcluster(mats):
    r = mats['rock']
    c = mats['crystal']
    g = bpy.data.objects.new('crystalcluster', None)
    bpy.context.collection.objects.link(g)
    shards = [
        (0, 0, 0.26, 1.3, (8, 0, 12)),
        (0.3, 0.1, 0.16, 0.8, (18, 0, -14)),
        (-0.26, 0.05, 0.14, 0.7, (-16, 0, 10)),
        (0.05, -0.24, 0.12, 0.55, (4, 8, 0)),
    ]
    for x, y, rr, h, rot in shards:
        cone(c, rr, h, (x, y, h / 2 - 0.06), rot=rot, verts=5)
    ball(r, 0.34, (0, 0, 0.10))
    return g


def bonepile(mats):
    b = mats['bone']
    g = bpy.data.objects.new('bonepile', None)
    bpy.context.collection.objects.link(g)
    ball(b, 0.24, (0, 0, 0.22))                       # skull (a ball with an eye notch is overkill)
    for i, (x, y, rot_z) in enumerate([(0.34, 0.05, 40), (-0.3, -0.08, -25), (0.1, -0.3, 80), (-0.12, 0.28, 140)]):
        cyl(b, 0.045, 0.55, (x, y, 0.06), rot=(0, 90, rot_z), verts=6)  # bones lying around
    ball(b, 0.15, (0.05, 0.02, 0.45))                 # a second smaller skull on top
    return g


def minecart(mats):
    iron, wood = mats['iron'], mats['wood']
    g = bpy.data.objects.new('minecart', None)
    bpy.context.collection.objects.link(g)
    # tapering body: two boxes, the lower one smaller, plus rims
    box(wood, (1.1, 1.4, 0.55), (0, 0, 0.52))
    box(iron, (1.18, 1.48, 0.08), (0, 0, 0.86))
    box(iron, (1.18, 0.08, 0.08), (0, 0.72, 0.55))
    box(iron, (1.18, 0.08, 0.08), (0, -0.72, 0.55))
    for y in (-0.45, 0.45):
        cyl(iron, 0.16, 0.1, (0, y, 0.16), rot=(0, 90, 0), verts=10)
    # a heap of ore inside
    ball(mats['stone'], 0.3, (0, 0.05, 0.85))
    ball(mats['goldore'], 0.18, (0.25, -0.15, 0.8))
    return g


def rails(mats):
    iron, wood = mats['iron'], mats['wooddark']
    g = bpy.data.objects.new('rails', None)
    bpy.context.collection.objects.link(g)
    for x in (-0.3, 0.3):
        box(iron, (0.07, 2.2, 0.06), (x, 0, 0.09))
    for y in (-0.9, -0.3, 0.3, 0.9):
        box(wood, (0.9, 0.16, 0.07), (0, y, 0.035))
    return g


def support(mats):
    wood = mats['wooddark']
    g = bpy.data.objects.new('support', None)
    bpy.context.collection.objects.link(g)
    box(wood, (0.22, 0.22, 1.9), (-0.65, 0, 0.95))
    box(wood, (0.22, 0.22, 1.9), (0.65, 0, 0.95))
    box(wood, (1.8, 0.3, 0.26), (0, 0, 1.95))          # lintel across the top
    box(wood, (0.5, 0.22, 0.22), (0.5, 0, 1.55))       # a diagonal brace, simplified to a stub
    return g


def well(mats):
    stone, wood, iron = mats['rockdark'], mats['wooddark'], mats['iron']
    g = bpy.data.objects.new('well', None)
    bpy.context.collection.objects.link(g)
    cyl(stone, 0.62, 0.75, (0, 0, 0.375), verts=12)     # stone ring
    torus(stone, 0.6, 0.1, (0, 0, 0.78))
    box(wood, (0.12, 0.12, 1.1), (-0.55, 0, 1.25))
    box(wood, (0.12, 0.12, 1.1), (0.55, 0, 1.25))
    box(wood, (1.5, 0.1, 0.08), (0, 0, 1.85))           # crossbar
    cyl(iron, 0.05, 1.3, (0, 0, 1.85), rot=(0, 90, 0), verts=6)
    # little pitched roof
    box(wood, (0.08, 1.1, 0.6), (-0.5, 0, 2.05), rot=(0, 30, 0))
    box(wood, (0.08, 1.1, 0.6), (0.5, 0, 2.05), rot=(0, -30, 0))
    return g


def haybale(mats):
    straw, wood = mats['straw'], mats['wooddark']
    g = bpy.data.objects.new('haybale', None)
    bpy.context.collection.objects.link(g)
    cyl(straw, 0.55, 1.1, (0, 0, 0.55), rot=(0, 90, 0), verts=12)
    for x in (-0.3, 0.3):
        torus(wood, 0.56, 0.03, (x, 0, 0.55), rot=(0, 90, 0))
    return g


def crate(mats):
    wood, leaf = mats['wood'], mats['leaf']
    g = bpy.data.objects.new('crate', None)
    bpy.context.collection.objects.link(g)
    box(wood, (0.9, 0.9, 0.6), (0, 0, 0.3))
    for y in (-0.44, 0.44):
        box(wood, (0.94, 0.05, 0.05), (0, y, 0.3))
    for x in (-0.44, 0.44):
        box(wood, (0.05, 0.94, 0.05), (x, 0, 0.3))
    for (x, y) in [(-0.18, 0.1), (0.2, -0.12), (0.02, -0.25)]:
        ball(leaf, 0.14, (x, y, 0.62), subdiv=1)      # fruit/produce peeking out
    return g


def signpost(mats):
    wood, woodd = mats['wood'], mats['wooddark']
    g = bpy.data.objects.new('signpost', None)
    bpy.context.collection.objects.link(g)
    cyl(woodd, 0.06, 1.7, (0, 0, 0.85), verts=8)
    box(wood, (0.7, 0.05, 0.22), (0.18, 0, 1.45), rot=(0, 0, -12))   # one board points right
    box(wood, (0.55, 0.05, 0.2), (-0.2, 0.02, 1.1), rot=(0, 0, 8))   # one points left
    return g


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    os.makedirs(OUT, exist_ok=True)
    mats = {
        'rock': mat('rock', STONE, rough=0.95),
        'rockdark': mat('rockdark', STONE_DARK, rough=0.95),
        'stone': mat('stone', (0.5, 0.48, 0.46), rough=0.9),
        'goldore': mat('goldore', GOLD, rough=0.3, metal=0.6),
        'crystal': mat('crystal', CRYSTAL_BLUE, rough=0.15, alpha=0.9, emit=CRYSTAL_GLOW, emit_strength=0.7),
        'bone': mat('bone', BONE, rough=0.7),
        'iron': mat('iron', IRON, rough=0.45, metal=0.7),
        'wood': mat('wood', WOOD, rough=0.85),
        'wooddark': mat('wooddark', WOOD_DARK, rough=0.85),
        'straw': mat('straw', STRAW, rough=1.0),
        'leaf': mat('leaf', LEAF, rough=0.6),
    }
    builders = {
        'stalagmite': stalagmite, 'crystalcluster': crystalcluster, 'bonepile': bonepile,
        'minecart': minecart, 'rails': rails, 'support': support, 'well': well,
        'haybale': haybale, 'crate': crate, 'signpost': signpost,
    }
    for name, build in builders.items():
        root = build(mats)
        bpy.ops.object.select_all(action='DESELECT')
        for o in bpy.context.collection.objects:
            o.select_set(True)
        bpy.context.view_layer.objects.active = root
        path = os.path.join(OUT, f'{name}.glb')
        bpy.ops.export_scene.gltf(
            filepath=path, export_format='GLB', use_selection=True,
            export_apply=True, export_materials='EXPORT', export_yup=True,
        )
        # wipe the objects for the next prop (materials are reused)
        for o in list(bpy.data.objects):
            bpy.data.objects.remove(o, do_unlink=True)
        print('MADE', path)


main()
