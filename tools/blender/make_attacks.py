"""Generate attack animations for the KayKit Rig_Medium skeleton.

Run (from the project root):
  flatpak run org.blender.Blender -b --python tools/blender/make_attacks.py -- \
      assets/KayKit_Adventurers_2.0_FREE/Animations/gltf/Rig_Medium/Rig_Medium_General.glb \
      assets/generated/Rig_Medium_Combat.glb

(or `npm run make-anims`). Every clip starts and ends on the Idle_A pose so
it blends cleanly with the rest of the KayKit animations.

Poses are written as rotations about WORLD axes, applied parent-first, so
they're easy to read without knowing each bone's local axes:
  Blender world: -Y = character's forward, -X = character's right, +Z = up.
  ('X', -90) on an arm hanging down swings it forward to horizontal.
  ('Z', -30) on the chest twists the torso to the character's right.
  ('X', +15) on the chest leans forward (negative leans back).
  ('Y', +90) on the right upper arm lifts it out sideways to the right.
"""
import math
import sys

import bpy
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = argv[0], argv[1]
FPS = 30

# Poses are applied in this order. Body bones first, then elbow bends, then
# the arm "aims", then wrists/hands, then legs.
BODY = ['hips', 'spine', 'chest', 'head']
BENDS = ['lowerarm.r', 'lowerarm.l']
HANDS = ['wrist.r', 'hand.r', 'wrist.l', 'hand.l']
LEGS = ['upperleg.r', 'lowerleg.r', 'foot.r', 'upperleg.l', 'lowerleg.l', 'foot.l']

# Directions (Blender world): forward = -Y, right = -X, left = +X, up = +Z.
F, B, R, L, U, D = (0, -1, 0), (0, 1, 0), (-1, 0, 0), (1, 0, 0), (0, 0, 1), (0, 0, -1)


def d(*parts):
    """Blend named directions, e.g. d(R, U, B) = up and back over the right shoulder."""
    v = Vector((0, 0, 0))
    for p in parts:
        v += Vector(p)
    return tuple(v.normalized())


# Each clip: list of (frame, pose).
#   'aim.r': (arm_dir, weapon_dir)  - point the whole right arm along arm_dir with the
#                                     weapon (handslot) pointing along weapon_dir
#   'move': (x, y, z)               - shift the whole body (metres)
#   '<bone>': [(axis, degrees)]     - extra rotation about a world axis
CLIPS = {
    # one-handed sword / axe: wind up over the right shoulder, slash down across to the left
    'Attack_Slash': [
        (0, {}),
        (5, {
            'chest': [('Z', -35)],
            'lowerarm.r': [('X', -40)],
            'aim.r': (d(R, U, B), d(U, B, L)),
            'aim.l': (d(F, L, D, D), d(F)),
        }),
        (9, {
            'move': (0, -0.12, 0),
            'chest': [('Z', 30), ('X', 10)],
            'aim.r': (d(F, F, L, D), d(F, L, L)),
            'aim.l': (d(B, L, D, D), d(F)),
            'upperleg.r': [('X', -25)], 'lowerleg.r': [('X', 25)],
        }),
        (12, {
            'move': (0, -0.1, 0),
            'chest': [('Z', 35), ('X', 8)],
            'aim.r': (d(F, L, D), d(L, D, B)),
            'aim.l': (d(B, L, D, D), d(F)),
            'upperleg.r': [('X', -20)], 'lowerleg.r': [('X', 20)],
        }),
        (18, {}),
    ],
    # two-handed weapons: big overhead chop
    'Attack_Chop': [
        (0, {}),
        (7, {
            'move': (0, 0.05, 0),
            'chest': [('X', -15)],
            'lowerarm.r': [('X', -50)], 'lowerarm.l': [('X', -50)],
            'aim.r': (d(U, U, B, L), d(B, U)),
            'aim.l': (d(U, U, B, R), d(B, U)),
        }),
        (11, {
            'move': (0, -0.18, -0.06),
            'chest': [('X', 20)], 'spine': [('X', 8)],
            'aim.r': (d(F, F, D, L), d(F, D, D)),
            'aim.l': (d(F, F, D, R), d(F, D, D)),
            'upperleg.r': [('X', -35)], 'lowerleg.r': [('X', 40)], 'upperleg.l': [('X', 15)],
        }),
        (15, {
            'move': (0, -0.15, -0.05),
            'chest': [('X', 16)], 'spine': [('X', 6)],
            'aim.r': (d(F, D, D, L), d(F, D, D, D)),
            'aim.l': (d(F, D, D, R), d(F, D, D, D)),
            'upperleg.r': [('X', -30)], 'lowerleg.r': [('X', 35)],
        }),
        (24, {}),
    ],
    # daggers: pull back, then a quick forward stab
    'Attack_Stab': [
        (0, {}),
        (4, {
            'move': (0, 0.06, 0),
            'chest': [('Z', -25)],
            'lowerarm.r': [('X', -90)],
            'aim.r': (d(D, B, R), d(F)),
            'aim.l': (d(F, D, L), d(F)),
        }),
        (7, {
            'move': (0, -0.2, -0.04),
            'chest': [('Z', 20), ('X', 10)],
            'aim.r': (d(F, F, F, L), d(U)),
            'hand.r': [('X', 75)],
            'aim.l': (d(B, D, L), d(F)),
            'upperleg.r': [('X', -35)], 'lowerleg.r': [('X', 35)],
        }),
        (10, {
            'move': (0, -0.18, -0.03),
            'chest': [('Z', 15), ('X', 8)],
            'aim.r': (d(F, F, F, L, D), d(U)),
            'hand.r': [('X', 70)],
            'aim.l': (d(B, D, L), d(F)),
            'upperleg.r': [('X', -30)], 'lowerleg.r': [('X', 30)],
        }),
        (15, {}),
    ],
    # staffs: raise it high, then thrust it forward
    'Attack_Cast': [
        (0, {}),
        (6, {
            'move': (0, 0.05, 0.04),
            'chest': [('X', -12)],
            'aim.r': (d(U, U, F, R), d(U, B)),
            'aim.l': (d(L, U), d(F)),
        }),
        (10, {
            'move': (0, -0.15, 0),
            'chest': [('X', 16)],
            'aim.r': (d(F, F, U), d(U)),
            'hand.r': [('X', 60)],
            'aim.l': (d(F, L, D), d(F)),
            'upperleg.r': [('X', -25)], 'lowerleg.r': [('X', 25)],
        }),
        (14, {
            'move': (0, -0.12, 0),
            'chest': [('X', 12)],
            'aim.r': (d(F, F, U), d(U)),
            'hand.r': [('X', 55)],
            'aim.l': (d(F, L, D), d(F)),
            'upperleg.r': [('X', -20)], 'lowerleg.r': [('X', 20)],
        }),
        (21, {}),
    ],
}

AXES = {'X': Vector((1, 0, 0)), 'Y': Vector((0, 1, 0)), 'Z': Vector((0, 0, 1))}


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=SRC)
    scene = bpy.context.scene
    scene.render.fps = FPS
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    bpy.context.view_layer.objects.active = arm
    pose_bones = arm.pose.bones

    # base pose = first frame of Idle_A
    arm.animation_data_create()
    idle = bpy.data.actions['Idle_A']
    arm.animation_data.action = idle
    slot_assign(arm, idle)
    scene.frame_set(int(idle.frame_range[0]))
    base = {pb.name: pb.matrix_basis.copy() for pb in pose_bones}
    keep = set(CLIPS)

    for name, keys in CLIPS.items():
        action = bpy.data.actions.new(name)
        action.use_fake_user = True
        arm.animation_data.action = action
        slot_assign(arm, action)
        for frame, pose in keys:
            apply_pose(arm, base, pose)
            for pb in pose_bones:
                pb.keyframe_insert('rotation_quaternion', frame=frame)
                pb.keyframe_insert('location', frame=frame)
                pb.keyframe_insert('scale', frame=frame)
        for fc in iter_fcurves(action):
            for kp in fc.keyframe_points:
                kp.interpolation = 'BEZIER'
                kp.easing = 'AUTO'
        print(f'MADE {name}: {keys[-1][0] / FPS:.2f}s')

    # export only our new clips
    for a in list(bpy.data.actions):
        if a.name not in keep:
            bpy.data.actions.remove(a)
    for o in list(bpy.data.objects):
        if o != arm:
            bpy.data.objects.remove(o, do_unlink=True)
    arm.animation_data.action = None
    bpy.ops.object.select_all(action='DESELECT')
    arm.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=OUT, export_format='GLB', use_selection=True,
        export_animations=True, export_animation_mode='ACTIONS',
        export_force_sampling=True, export_frame_step=1,
        export_def_bones=False, export_optimize_animation_size=False,
        export_skins=True, export_morph=False, export_materials='NONE',
    )
    print('EXPORTED', OUT)


def apply_pose(arm, base, pose):
    pbs = arm.pose.bones
    for pb in pbs:
        pb.rotation_mode = 'QUATERNION'
        pb.matrix_basis = base[pb.name].copy()
    bpy.context.view_layer.update()
    move = pose.get('move')
    if move:
        root = pbs['root']
        m = root.matrix.copy()
        m.translation += Vector(move)
        root.matrix = m
        bpy.context.view_layer.update()
    for bone in BODY + BENDS:
        rotate(pbs[bone], pose.get(bone))
    for side in ('r', 'l'):
        if f'aim.{side}' in pose:
            aim(pbs, side, *pose[f'aim.{side}'])
    for bone in HANDS + LEGS:
        rotate(pbs[bone], pose.get(bone))


def rotate_about(pb, rot3):
    """Rotate a pose bone (and so its children) about its own head by a world-space 3x3."""
    m = pb.matrix.copy()
    head = m.translation.copy()
    pb.matrix = Matrix.Translation(head) @ rot3.to_4x4() @ Matrix.Translation(-head) @ m
    bpy.context.view_layer.update()


def rotate(pb, rots):
    for axis, deg in rots or []:
        rotate_about(pb, Matrix.Rotation(math.radians(deg), 3, AXES[axis]))


def frame(a, b):
    """Orthonormal basis with a as the first axis and b (made perpendicular) as the second."""
    a = Vector(a).normalized()
    b = Vector(b)
    b = (b - a * a.dot(b)).normalized()
    return Matrix((a, b, a.cross(b))).transposed()


def aim(pbs, side, arm_dir, weapon_dir):
    upper, hand, slot = pbs[f'upperarm.{side}'], pbs[f'hand.{side}'], pbs[f'handslot.{side}']
    cur_arm = hand.head - upper.head
    cur_weapon = slot.tail - slot.head   # the handslot bone points where a held weapon points
    rot = frame(arm_dir, weapon_dir) @ frame(cur_arm, cur_weapon).transposed()
    rotate_about(upper, rot)


def slot_assign(obj, action):
    """Blender 4.4+ 'slotted actions': make sure the action drives this object."""
    ad = obj.animation_data
    if hasattr(ad, 'action_slot'):
        if not action.slots:
            action.slots.new(id_type='OBJECT', name=obj.name)
        ad.action_slot = action.slots[0]


def iter_fcurves(action):
    if hasattr(action, 'layers') and action.layers:
        for layer in action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    yield from bag.fcurves
    else:
        yield from action.fcurves


main()
