// The draw-call savers in client/merge.js: merging must keep every piece where it was (and lights
// alive), and trimming a block must only drop faces the camera can't see.
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mergeStatic, trimBlock, dropTinyShadows } from '../src/client/merge.js';

const red = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const red2 = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const blue = new THREE.MeshStandardMaterial({ color: 0x0000ff });

describe('mergeStatic', () => {
  test('one mesh per look, same bounds, lights kept', () => {
    const g = new THREE.Group();
    g.position.set(10, 0, 5);
    const a = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), red); a.position.set(2, 0, 0);
    const b = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), red2); b.position.set(-2, 0, 0); // same look, other material object
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.5), blue); c.position.set(0, 3, 0);
    const inner = new THREE.Group(); inner.position.set(0, 0, 4); inner.add(c);
    const light = new THREE.PointLight(0xffffff, 1); light.position.set(0, 5, 0); inner.add(light);
    g.add(a, b, inner);
    const before = new THREE.Box3().setFromObject(g);

    const made = mergeStatic(g);
    const meshes = g.children.filter((o) => o.isMesh);
    expect(meshes.length).toBe(2);
    expect(made.length).toBe(2);
    expect(new THREE.Box3().setFromObject(g).equals(before)).toBe(true);
    const kept = g.children.find((o) => o.isLight);
    expect(kept).toBe(light);
    g.updateMatrixWorld(true);
    expect(light.getWorldPosition(new THREE.Vector3()).toArray()).toEqual([10, 5, 9]);
  });
});

describe('trimBlock', () => {
  const box = new THREE.BoxGeometry(2, 2, 2); // 12 triangles, two per face
  test('ground keeps only the top', () => {
    const t = trimBlock(box, 'ground');
    expect(t.attributes.position.count / 3).toBe(2);
    t.computeBoundingBox();
    expect(t.boundingBox.min.y).toBe(1);
  });
  test('wall drops only the bottom', () => {
    expect(trimBlock(box, 'wall').attributes.position.count / 3).toBe(10);
  });
  test('cached per geometry and mode', () => {
    expect(trimBlock(box, 'wall')).toBe(trimBlock(box, 'wall'));
  });
});

test('dropTinyShadows only touches tiny parts', () => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), red);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05), blue);
  body.castShadow = eye.castShadow = true;
  g.add(body, eye);
  dropTinyShadows(g);
  expect(body.castShadow).toBe(true);
  expect(eye.castShadow).toBe(false);
});
