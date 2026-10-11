import bpy, sys
argv = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=argv[0])
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
print('ARMATURE', arm.name, 'rot', tuple(round(v,3) for v in arm.rotation_euler), 'scale', tuple(arm.scale))
for b in arm.data.bones:
    print('BONE', b.name, 'parent', b.parent.name if b.parent else None, 'head', tuple(round(v,2) for v in b.head_local), 'tail', tuple(round(v,2) for v in b.tail_local))
print('ACTIONS', [a.name for a in bpy.data.actions])
for o in bpy.data.objects: print('OBJ', o.name, o.type, o.parent.name if o.parent else None)
