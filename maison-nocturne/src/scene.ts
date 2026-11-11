import * as THREE from 'three';
import type { ObjectId, PuzzleId } from './game';

export interface SalonScene {
  enter: (immediate?: boolean) => void;
  focus: (id: ObjectId) => void;
  resetView: () => void;
  setPaused: (paused: boolean) => void;
  setProgress: (solved: boolean, completed: boolean, discovered: PuzzleId[]) => void;
  setMotion: (reduced: boolean) => void;
  setMove: (direction: string, down: boolean) => void;
  dispose: () => void;
}

export function createSalon(
  container: HTMLElement,
  onProject: (points: { id: ObjectId; x: number; y: number; visible: boolean; distance: number }[]) => void,
  onInteract: (id: ObjectId) => void,
): SalonScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#11191d');
  scene.fog = new THREE.FogExp2('#152025', 0.016);
  const camera = new THREE.PerspectiveCamera(53, innerWidth / innerHeight, 0.1, 80);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.domElement.setAttribute('aria-label', 'Interactive 3D couture salon. Drag to look, WASD to move. Use the Objects menu for keyboard-accessible inspection.');
  renderer.domElement.tabIndex = 0;
  container.append(renderer.domElement);

  const mat = (color: string, roughness = 0.6, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const gold = mat('#a48148', 0.3, 0.8);
  const brightGold = mat('#dcc28c', 0.25, 0.75);
  const darkGold = mat('#6d5132', 0.4, 0.65);
  const wall = mat('#283d3c', 0.82);
  const panel = mat('#203332', 0.76);
  const wood = mat('#231d19', 0.55);
  const marble = mat('#212b2c', 0.28, 0.1);
  const velvet = new THREE.MeshPhysicalMaterial({ color: '#48212c', roughness: 0.95, sheen: 1, sheenColor: new THREE.Color('#9b5465') });
  const ivory = mat('#d3c4a7', 0.7);
  const glow = new THREE.MeshBasicMaterial({ color: '#fff1c9' });
  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0, parent: THREE.Object3D = scene) => {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  const box = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) => mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z, parent);
  const sphere = (r: number, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) => mesh(new THREE.SphereGeometry(r, 16, 12), material, x, y, z, parent);
  const cylinder = (r: number, rb: number, h: number, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) => mesh(new THREE.CylinderGeometry(r, rb, h, 32), material, x, y, z, parent);
  const tube = (points: THREE.Vector3[], r: number, material: THREE.Material, parent: THREE.Object3D = scene, closed = false) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, closed), Math.max(24, points.length * 5), r, 7, closed), material, 0, 0, 0, parent);
  const ellipse = (rx: number, ry: number, z: number, centerY: number, r: number, material: THREE.Material, parent: THREE.Object3D, centerX = 0) => {
    return tube(Array.from({ length: 64 }, (_, i) => { const a = i / 64 * Math.PI * 2; return new THREE.Vector3(centerX + Math.sin(a) * rx, centerY + Math.cos(a) * ry, z); }), r, material, parent, true);
  };
  const frame = (w: number, h: number, x: number, y: number, z: number, parent = scene as THREE.Object3D) => {
    box(w, .035, .045, darkGold, x, y - h / 2, z, parent);
    box(w, .035, .045, darkGold, x, y + h / 2, z, parent);
    box(.035, h, .045, darkGold, x - w / 2, y, z, parent);
    box(.035, h, .045, darkGold, x + w / 2, y, z, parent);
  };

  // Architecture: a complete salon with an open entrance wall.
  box(16, .3, 15, wood, 0, -.18, 0);
  box(16, 6.5, .3, wall, 0, 3.25, -7);
  box(.3, 6.5, 15, wall, -8, 3.25, 0);
  box(.3, 6.5, 15, wall, 8, 3.25, 0);
  box(16, .2, 15, mat('#263534'), 0, 6.4, 0);
  // Alternating parquet blocks, batched into one draw call without overlapping boards.
  const floor = new THREE.InstancedMesh(new THREE.BoxGeometry(.313, .025, .953), mat('#67503b', .56), 800);
  const dummy = new THREE.Object3D(); let plankCount = 0;
  for (let i = 0; i < 16; i++) for (let j = 0; j < 15; j++) {
    const x = (i - 7.5) * .96, z = (j - 7) * .96;
    const horizontal = (i + j) % 2 === 0;
    for (let k = 0; k < 3; k++) {
      dummy.position.set(x + (horizontal ? 0 : (k - 1) * .32), -.012, z + (horizontal ? (k - 1) * .32 : 0));
      dummy.rotation.set(0, horizontal ? Math.PI / 2 : 0, 0); dummy.updateMatrix();
      floor.setMatrixAt(plankCount, dummy.matrix);
      floor.setColorAt(plankCount, new THREE.Color().setHSL(.085, .23, .24 + ((i * i + j * j + k * 7) % 9) * .012));
      plankCount++;
    }
  }
  floor.count = plankCount; floor.receiveShadow = true; scene.add(floor);
  // Wall panelling and layered cornices.
  for (const y of [.12, .26, 1.18, 1.27, 5.9, 6.04, 6.2]) {
    box(16, y > 5 ? .12 : .06, .12, y > 5 ? gold : darkGold, 0, y, -6.8);
    box(.12, y > 5 ? .12 : .06, 15, y > 5 ? gold : darkGold, -7.8, y, 0);
    box(.12, y > 5 ? .12 : .06, 15, y > 5 ? gold : darkGold, 7.8, y, 0);
  }
  for (let x = -7; x < 8; x += 2) {
    box(1.75, .82, .04, panel, x, .69, -6.8);
    frame(1.6, .67, x, .69, -6.75);
    if (Math.abs(x) > 2) frame(1.65, 3.9, x, 3.56, -6.79);
  }
  for (const side of [-1, 1]) {
    const g = new THREE.Group(); g.position.x = side * 7.79; g.rotation.y = side * -Math.PI / 2; scene.add(g);
    for (let z = -6; z <= 6; z += 2) { frame(1.65, .72, z, .7, .03, g); frame(1.65, 3.9, z, 3.56, .03, g); }
  }
  const ceilingTrim = new THREE.Group(); ceilingTrim.position.set(0, 6.27, 0); ceilingTrim.rotation.x = Math.PI / 2; scene.add(ceilingTrim);
  frame(13.8, 11.8, 0, 0, 0, ceilingTrim); frame(13.45, 11.45, 0, 0, .015, ceilingTrim);

  function curtain(parent: THREE.Object3D, x: number, z: number, width: number, length: number) {
    const geo = new THREE.PlaneGeometry(width, length, 40, 20);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / width + .5, v = p.getY(i) / length + .5;
      p.setZ(i, Math.sin(u * Math.PI * 12) * .11 + Math.sin(v * Math.PI) * .08);
      p.setX(i, p.getX(i) + Math.sin(v * Math.PI) * .12);
    }
    geo.computeVertexNormals();
    const fabric = velvet.clone(); fabric.side = THREE.DoubleSide;
    mesh(geo, fabric, x, 3.25, z, parent);
    cylinder(.055, .055, width + .2, gold, x, 5.63, z, parent).rotation.z = Math.PI / 2;
    for (let a = 0; a < 8; a++) sphere(.043, gold, x - width / 2 + (a + .5) * width / 8, 5.56, z, parent);
  }
  // Tall windows, blue glass and gathered burgundy velvet.
  for (const side of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(side * 7.76, 0, -.2); g.rotation.y = -side * Math.PI / 2; scene.add(g);
    box(2.65, 4.35, .08, wood, 0, 3.4, .04, g);
    box(2.4, 4.1, .03, new THREE.MeshBasicMaterial({ color: '#1c3549' }), 0, 3.4, .11, g);
    for (const x of [-1.2, 0, 1.2]) box(.055, 4.1, .07, gold, x, 3.4, .15, g);
    for (const y of [1.35, 2.7, 4.1, 5.45]) box(2.4, .055, .07, gold, 0, y, .15, g);
    // Distant Parisian rooftops, deliberately understated.
    for (let i = 0; i < 11; i++) box(.26, .3 + (i % 3) * .15, .01, mat('#101d28'), -1.08 + i * .21, 1.6 + (i % 3) * .06, .135, g);
    sphere(.19, new THREE.MeshBasicMaterial({ color: '#b7d3d7' }), .62, 4.8, .13, g);
    curtain(g, -1.52, .32, .88, 4.7); curtain(g, 1.52, .32, .88, 4.7);
    tube([new THREE.Vector3(-1.95, 5.5, .38), new THREE.Vector3(0, 5.05, .5), new THREE.Vector3(1.95, 5.5, .38)], .14, velvet, g);
    const moon = new THREE.SpotLight('#9dbbdf', 90, 20, .8, .8, 1.8);
    moon.position.set(side * 7.4, 4.3, -.2); moon.target.position.set(-side * 2, 0, 1); scene.add(moon, moon.target);
  }

  // Aged oval rug with concentric woven edging.
  const rugMat = mat('#452b30', 1);
  for (const [rx, rz, y, material] of [[3.8, 4.4, .012, darkGold], [3.72, 4.32, .017, rugMat], [3.35, 3.95, .022, darkGold], [3.31, 3.91, .027, rugMat]] as const) {
    const rug = cylinder(1, 1, .008, material, 0, y, -.2); rug.scale.set(rx, 1, rz);
  }
  const rugPattern = new THREE.Group(); rugPattern.position.set(0, .034, -.2); rugPattern.rotation.x = -Math.PI / 2; scene.add(rugPattern);
  ellipse(.5, .8, 0, 0, .013, darkGold, rugPattern);
  for (let i = 0; i < 8; i++) {
    const motif = new THREE.Group(); motif.rotation.z = i * Math.PI / 4; rugPattern.add(motif);
    ellipse(.16, .45, 0, 1.15, .012, darkGold, motif);
  }

  // The enchanted mirror; the shifting surface is a realtime shader.
  const mirrorGroup = new THREE.Group(); mirrorGroup.position.set(0, 0, -6.7); scene.add(mirrorGroup);
  const mirrorMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, awakened: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 vUv; uniform float time; uniform float awakened;
      void main(){vec2 p=vUv-.5; float mist=sin(p.x*14.+sin(p.y*12.+time*.2)*2.+time*.13)*.5+.5;
      float ribbon=pow(max(0.,1.-abs(p.x+sin(p.y*7.+time*.16)*.1)*4.),3.);
      vec3 c=mix(vec3(.055,.105,.13),vec3(.18,.28,.3),mist*.45);
      c+=ribbon*vec3(.07,.12,.13); c+=awakened*ribbon*vec3(.23,.24,.17);
      float stars=pow(max(0.,sin(p.x*167.)*sin(p.y*181.)),40.);c+=stars*.25;
      float edge=1.-smoothstep(.30,.51,length(p*vec2(1.,.6)));gl_FragColor=vec4(c*edge+.015,1.);}`,
  });
  const mirrorSurface = mesh(new THREE.CircleGeometry(1, 96), mirrorMaterial, 0, 3.35, .06, mirrorGroup); mirrorSurface.scale.set(1.42, 2.12, 1);
  for (const [rx, ry, r, material] of [[1.45, 2.15, .095, gold], [1.58, 2.28, .05, darkGold], [1.35, 2.02, .022, brightGold]] as const) ellipse(rx, ry, .09, 3.35, r, material, mirrorGroup);
  // Gilt beading around the frame and an ornamental crest.
  for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2; sphere(.028, brightGold, Math.sin(a) * 1.54, 3.35 + Math.cos(a) * 2.23, .13, mirrorGroup); }
  for (const side of [-1, 1]) {
    tube([new THREE.Vector3(0, 5.57, .14), new THREE.Vector3(side * .47, 5.84, .14), new THREE.Vector3(side * .62, 5.5, .14), new THREE.Vector3(side * .23, 5.49, .14)], .04, gold, mirrorGroup);
  }
  const crest = sphere(.14, gold, 0, 5.72, .16, mirrorGroup); crest.scale.set(.65, 1.5, .5);
  box(3.8, .17, .84, marble, 0, 1.05, -6.12);
  box(3.66, .06, .88, gold, 0, .95, -6.12);
  for (const x of [-1.5, 1.5]) {
    cylinder(.07, .1, .92, gold, x, .47, -6.12);
    tube([new THREE.Vector3(x, .85, -6.12), new THREE.Vector3(x * .85, .4, -6.12), new THREE.Vector3(x, .08, -6.12)], .05, darkGold);
  }
  // Clock on the mantel.
  const clock = mesh(new THREE.CircleGeometry(.22, 32), ivory, 0, 1.4, -5.91);
  ellipse(.24, .24, -5.9, 1.4, .03, gold, scene);
  box(.018, .15, .02, wood, 0, 1.45, -5.89); const hand = box(.13, .016, .02, wood, .05, 1.4, -5.88); hand.rotation.z = -.2;
  clock.name = 'Midnight clock';

  // Candelabras and sconces.
  function candle(x: number, y: number, z: number, parent: THREE.Object3D = scene) {
    cylinder(.035, .04, .24, ivory, x, y, z, parent);
    const flame = sphere(.043, glow, x, y + .16, z, parent); flame.scale.set(.6, 1.7, .6);
  }
  for (const x of [-2.65, 2.65, -6.9, 6.9]) {
    sphere(.12, gold, x, 3.05, -6.65);
    for (const side of [-1, 1]) {
      tube([new THREE.Vector3(x, 3.05, -6.65), new THREE.Vector3(x + side * .2, 2.95, -6.33), new THREE.Vector3(x + side * .26, 3.25, -6.28)], .026, gold);
      candle(x + side * .26, 3.4, -6.28);
    }
    const light = new THREE.PointLight('#ffd39a', 12, 6, 1.8); light.position.set(x, 3.6, -6.05); scene.add(light);
  }

  // Crystal chandelier.
  const chandelier = new THREE.Group(); chandelier.position.set(0, 4.65, -.15); scene.add(chandelier);
  cylinder(.026, .026, 1.6, gold, 0, .9, 0, chandelier);
  sphere(.18, gold, 0, .05, 0, chandelier);
  const crystal = new THREE.MeshPhysicalMaterial({ color: '#e4e3d6', metalness: .25, roughness: .13, transparent: true, opacity: .72 });
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, x = Math.cos(a), z = Math.sin(a);
    tube([new THREE.Vector3(0, .1, 0), new THREE.Vector3(x * .5, -.3, z * .5), new THREE.Vector3(x, -.16, z), new THREE.Vector3(x * 1.12, .16, z * 1.12)], .035, gold, chandelier);
    cylinder(.13, .1, .055, gold, x * 1.12, .18, z * 1.12, chandelier); candle(x * 1.12, .31, z * 1.12, chandelier);
    tube([new THREE.Vector3(0, .8, 0), new THREE.Vector3(x * .5, .3, z * .5), new THREE.Vector3(x, .1, z)], .012, gold, chandelier);
    for (let j = 0; j < 5; j++) {
      const r = .3 + j * .15;
      const bead = mesh(new THREE.OctahedronGeometry(.045 + j * .005), crystal, x * r, -.1 - Math.sin(j / 5 * Math.PI) * .38, z * r, chandelier);
      bead.scale.y = 1.8;
    }
    const drop = mesh(new THREE.OctahedronGeometry(.095), crystal, x, -.45, z, chandelier); drop.scale.y = 2.2;
  }
  const centerDrop = mesh(new THREE.OctahedronGeometry(.18), crystal, 0, -.65, 0, chandelier); centerDrop.scale.y = 1.7;
  const mainLight = new THREE.PointLight('#ffe1af', 78, 20, 2); mainLight.position.set(0, 4.8, 0); scene.add(mainLight);
  const keyLight = new THREE.SpotLight('#e8d9bf', 115, 23, 1.05, .7, 1.8);
  keyLight.position.set(-1, 6, 4); keyLight.target.position.set(0, 0, -2); keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024); keyLight.shadow.bias = -.001; scene.add(keyLight, keyLight.target);
  scene.add(new THREE.HemisphereLight('#a8c7dd', '#594936', .6));
  const frontLight = new THREE.DirectionalLight('#c1c6d4', .7); frontLight.position.set(0, 3, 8); scene.add(frontLight);

  // Tufted velvet chaise longue.
  const sofa = new THREE.Group(); sofa.position.set(-4.7, 0, 3); sofa.rotation.y = .25; scene.add(sofa);
  box(2.6, .2, .85, gold, 0, .48, 0, sofa);
  const cushion = box(2.5, .24, .86, velvet, 0, .66, 0, sofa);
  const back = box(2.5, .65, .16, velvet, 0, 1.05, -.37, sofa); back.rotation.x = -.14;
  for (let i = 0; i < 9; i++) sphere(.035, darkGold, -1.05 + i * .26, 1.07, -.255, sofa);
  for (const x of [-1.22, 1.22]) {
    cylinder(.095, .07, .7, gold, x, .5, 0, sofa);
    const arm = cylinder(.13, .13, .78, velvet, x, .98, 0, sofa); arm.rotation.x = Math.PI / 2;
    for (const z of [-.32, .32]) cylinder(.04, .06, .42, gold, x, .21, z, sofa);
  }
  cushion.name = 'Burgundy velvet chaise';
  // An archivist's table and invitation.
  const table = new THREE.Group(); table.position.set(4.6, 0, 3); scene.add(table);
  const top = cylinder(.8, .8, .09, wood, 0, .85, 0, table); top.scale.z = .75;
  cylinder(.075, .14, .8, gold, 0, .42, 0, table);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    tube([new THREE.Vector3(0, .2, 0), new THREE.Vector3(Math.cos(a) * .4, .07, Math.sin(a) * .4), new THREE.Vector3(Math.cos(a) * .5, .06, Math.sin(a) * .5)], .04, gold, table);
  }
  const letter = box(.42, .008, .29, ivory, -.18, .907, .1, table); letter.rotation.y = -.2;
  const seal = cylinder(.05, .05, .013, mat('#702a35'), -.18, .922, .1, table);
  seal.name = 'Wax seal'; candle(.37, 1.05, -.1, table);

  // Stylised garments, modelled as pleated 3D surfaces rather than flat pictures.
  function cloth(profile: number[][], material: THREE.Material, parent: THREE.Object3D, pleats: number, amplitude: number) {
    const rows = 60, columns = 96, vertices: number[] = [], indices: number[] = [], uvs: number[] = [];
    const maxY = profile[profile.length - 1][0], minY = profile[0][0];
    for (let i = 0; i <= rows; i++) {
      const y = minY + (maxY - minY) * i / rows;
      let s = 0; while (s < profile.length - 2 && y > profile[s + 1][0]) s++;
      const a = profile[s], b = profile[s + 1], t = (y - a[0]) / (b[0] - a[0]);
      const rx = THREE.MathUtils.lerp(a[1], b[1], t), rz = THREE.MathUtils.lerp(a[2], b[2], t);
      for (let j = 0; j <= columns; j++) {
        const theta = j / columns * Math.PI * 2;
        const ripple = 1 + Math.cos(theta * pleats) * amplitude * (.3 + (1 - i / rows) * .7);
        vertices.push(Math.cos(theta) * rx * ripple, y, Math.sin(theta) * rz * ripple);
        uvs.push(j / columns, i / rows);
        if (i < rows && j < columns) { const k = i * (columns + 1) + j; indices.push(k, k + 1, k + columns + 1, k + 1, k + columns + 2, k + columns + 1); }
      }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.setIndex(indices); geo.computeVertexNormals();
    return mesh(geo, material, 0, 0, 0, parent);
  }
  function ringAt(y: number, rx: number, rz: number, parent: THREE.Object3D, material = brightGold, radius = .012) {
    tube(Array.from({ length: 48 }, (_, i) => { const a = i / 48 * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * rx, y, Math.sin(a) * rz); }), radius, material, parent, true);
  }
  const garmentPositions = {
    court: new THREE.Vector3(-4.5, 0, -.65),
    empire: new THREE.Vector3(-3.9, 0, -4.8),
    jazz: new THREE.Vector3(4.15, 0, -1.2),
  };
  for (const [type, position] of Object.entries(garmentPositions)) {
    const g = new THREE.Group(); g.position.copy(position); g.rotation.y = type === 'court' ? .25 : type === 'jazz' ? -.24 : .08; scene.add(g);
    cylinder(type === 'court' ? 1.3 : .86, type === 'court' ? 1.36 : .9, .16, marble, 0, .08, 0, g);
    cylinder(type === 'court' ? 1.32 : .88, type === 'court' ? 1.32 : .88, .022, gold, 0, .17, 0, g);
    cylinder(.035, .035, 2.2, darkGold, 0, 1.3, 0, g);
    const mannequinMaterial = mat('#b5a58d', .82);
    const body = sphere(.28, mannequinMaterial, 0, 2.2, 0, g); body.scale.set(1.1, 1.4, .7);
    cylinder(.085, .1, .25, mannequinMaterial, 0, 2.63, 0, g);
    sphere(.06, gold, 0, 2.8, 0, g);
    const fabric = new THREE.MeshPhysicalMaterial({ color: type === 'court' ? '#8b829c' : type === 'empire' ? '#e1d2af' : '#222a2c', roughness: .65, metalness: .05, sheen: .4, sheenColor: new THREE.Color(type === 'court' ? '#ddd1e4' : '#f4e1bc'), side: THREE.DoubleSide });
    if (type === 'court') {
      cloth([[.23, 1.13, .64], [.45, 1.15, .62], [.9, 1.02, .55], [1.4, .84, .43], [1.72, .56, .29], [1.9, .23, .18], [2.15, .32, .23], [2.4, .38, .23]], fabric, g, 24, .04);
      // Cream stomacher and front petticoat panel.
      const inset = fabric.clone(); inset.color.set('#ccbd9c');
      const front = cloth([[.26, .58, .65], [.75, .48, .6], [1.3, .34, .44], [1.87, .08, .195]], inset, g, 12, .045);
      front.scale.x = .78;
      for (const side of [-1, 1]) {
        const sleeve = sphere(.25, fabric, side * .44, 2.29, 0, g); sleeve.scale.set(.8, .9, 1);
        tube([new THREE.Vector3(side * .13, 1.84, .2), new THREE.Vector3(side * .32, 1.3, .48), new THREE.Vector3(side * .55, .65, .62), new THREE.Vector3(side * .63, .3, .68)], .025, ivory, g);
        for (let i = 0; i < 8; i++) {
          const rose = sphere(.045, ivory, side * (.18 + i * .053), 1.75 - i * .18, .28 + i * .052, g); rose.scale.z = .5;
        }
      }
      ringAt(2.38, .375, .235, g, ivory, .025);
      for (let i = 0; i < 5; i++) sphere(.025, gold, 0, 2.29 - i * .07, .24 - i * .009, g);
      ringAt(.3, 1.14, .66, g, darkGold, .018);
    } else if (type === 'empire') {
      cloth([[.24, .54, .38], [.4, .51, .36], [1.1, .39, .28], [1.8, .28, .22], [2.18, .27, .22], [2.35, .34, .24], [2.44, .32, .21]], fabric, g, 28, .05);
      ringAt(2.17, .285, .23, g, gold, .035);
      for (const side of [-1, 1]) {
        const sleeve = sphere(.2, fabric, side * .39, 2.38, 0, g); sleeve.scale.set(1, .9, 1.1);
        ringAt(.32, .535, .38, g, gold, .009);
      }
      tube([new THREE.Vector3(.12, 2.17, .24), new THREE.Vector3(.2, 1.7, .28), new THREE.Vector3(.23, 1.25, .33)], .018, gold, g);
    } else {
      cloth([[.78, .41, .25], [.98, .42, .26], [1.4, .36, .23], [1.6, .36, .23], [2.1, .34, .23], [2.37, .33, .23]], fabric, g, 20, .018);
      ringAt(1.42, .372, .243, g, gold, .035);
      for (let row = 0; row < 5; row++) {
        const y = 1 + row * .25, radius = .4 - row * .012;
        for (let j = 0; j < 32; j++) {
          const a = j / 32 * Math.PI * 2;
          sphere(.018, brightGold, Math.cos(a) * radius, y + Math.sin(a * 6) * .07, Math.sin(a) * .265, g);
        }
      }
      for (let i = 0; i < 40; i++) {
        const a = i / 40 * Math.PI * 2;
        cylinder(.008, .008, .2 + (i % 3) * .035, gold, Math.cos(a) * .414, .7, Math.sin(a) * .266, g);
      }
      // Long pearl necklace.
      for (let i = 0; i < 27; i++) { const a = i / 26 * Math.PI; sphere(.022, ivory, Math.cos(a) * .19, 2.36 - Math.sin(a) * .53, .245, g); }
    }
    // Brass museum plaque.
    const plaque = box(.52, .11, .025, gold, 0, .2, type === 'court' ? .96 : .69, g); plaque.rotation.x = -.5;
    const light = new THREE.SpotLight(type === 'court' ? '#d6c5ec' : '#fff0d2', 40, 10, .44, .6, 1.7);
    light.position.copy(position).add(new THREE.Vector3(.3, 5.6, 1.2)); light.target.position.copy(position).add(new THREE.Vector3(0, 1.3, 0)); scene.add(light, light.target);
  }

  // Locked double doors to the next room.
  const doorGroup = new THREE.Group(); doorGroup.position.set(5, 0, -6.78); scene.add(doorGroup);
  box(2.15, 3.9, .09, wood, 0, 1.95, 0, doorGroup);
  const doorPivot = new THREE.Group(); doorPivot.position.set(-1, 0, .07); doorGroup.add(doorPivot);
  box(2, 3.8, .1, panel, 1, 1.9, 0, doorPivot);
  for (const x of [.51, 1.49]) {
    frame(.8, 2.2, x, 2.4, .065, doorPivot); frame(.8, .9, x, .67, .065, doorPivot);
    cylinder(.04, .04, .24, gold, x < 1 ? .9 : 1.1, 1.56, .14, doorPivot);
  }
  for (const x of [-1.13, 1.13]) box(.12, 4.03, .2, gold, x, 2.02, .03, doorGroup);
  box(2.4, .15, .22, gold, 0, 4.04, .03, doorGroup);
  // Physical clue props respond to discoveries in the inspection panels.
  function inscription(text: string, subtitle: string, w: number, h: number) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#d5c5a1'; ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = '#8d7045'; ctx.lineWidth = 6; ctx.strokeRect(12, 12, 488, 232);
    ctx.fillStyle = '#253b39'; ctx.textAlign = 'center'; ctx.font = '48px Georgia'; ctx.fillText(text, 256, 115);
    ctx.font = '22px Georgia'; ctx.fillText(subtitle, 256, 175);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: texture, roughness: .8, side: THREE.DoubleSide }));
  }
  const hemLabel = inscription('PANNIERS', 'THE ROSE SEAL', .48, .24);
  hemLabel.position.set(-4.3, .38, .05); hemLabel.rotation.set(-.25, .25, -.15); scene.add(hemLabel);
  const foldedSketch = inscription('PARIS · 1805', 'THE COLUMN SEAL', .5, .26);
  foldedSketch.position.set(-3.9, .32, -4.04); foldedSketch.rotation.x = -.65; scene.add(foldedSketch);
  const drawer = new THREE.Group(); drawer.position.set(4.15, .24, -.65); scene.add(drawer);
  box(.57, .13, .5, wood, 0, 0, 0, drawer);
  box(.6, .15, .04, gold, 0, 0, .26, drawer);
  sphere(.035, ivory, 0, 0, .3, drawer);
  const danceCard = inscription('PARIS · 1925', 'THE PEARL SEAL', .43, .27);
  danceCard.rotation.x = -Math.PI / 2; danceCard.position.set(0, .075, .02); drawer.add(danceCard);
  const signature = inscription('R O I D', '12 · 02 · 1947', 1.5, .75);
  signature.position.set(0, 3.45, -6.56); scene.add(signature);
  hemLabel.visible = false; foldedSketch.visible = false; signature.visible = false; danceCard.visible = false;
  // Brass combination lock mounted on the door.
  const lockPlate = new THREE.Group(); lockPlate.position.set(1.58, 1.65, .15); doorPivot.add(lockPlate);
  box(.47, .66, .07, gold, 0, 0, 0, lockPlate);
  box(.36, .12, .01, marble, 0, .22, .045, lockPlate);
  for (let i = 0; i < 4; i++) sphere(.014, glow, -.12 + i * .08, .22, .06, lockPlate);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++)
    box(.085, .075, .035, darkGold, (col - 1) * .12, .08 - row * .105, .06, lockPlate);

  // Slow particles imply a magical house without frightening effects.
  const particleGeometry = new THREE.BufferGeometry();
  const particlePositions = Float32Array.from({ length: 360 }, (_, i) => {
    const r = (Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1;
    return i % 3 === 0 ? r * 7 : i % 3 === 1 ? Math.abs(r) * 5.5 : r * 6;
  });
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const dust = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: '#e2c99c', size: .018, transparent: true, opacity: .43, depthWrite: false })); scene.add(dust);

  const targets: Record<ObjectId, THREE.Vector3> = {
    court: garmentPositions.court.clone().add(new THREE.Vector3(0, 2.85, 0)),
    empire: garmentPositions.empire.clone().add(new THREE.Vector3(0, 2.85, 0)),
    jazz: garmentPositions.jazz.clone().add(new THREE.Vector3(0, 2.85, 0)),
    mirror: new THREE.Vector3(0, 3.2, -6.4),
    door: new THREE.Vector3(5, 2.2, -6.5),
    letter: new THREE.Vector3(4.6, 1.24, 3),
  };
  let started = false, paused = false, reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let solved = false, completed = false;
  let discoveries = new Set<PuzzleId>();
  let yaw = 0, pitch = -.025;
  const position = new THREE.Vector3(0, 1.95, 6.45);
  camera.position.set(1.15, 3.05, 10.4); camera.lookAt(.25, 2.5, -3.5);
  const keys = new Set<string>();
  let transition: { from: THREE.Vector3; to: THREE.Vector3; start: number; duration: number; fromYaw: number; toYaw: number; fromPitch: number; toPitch: number } | null = null;
  function moveCamera(to: THREE.Vector3, toYaw: number, toPitch: number, duration = 1100) {
    transition = { from: camera.position.clone(), to, start: performance.now(), duration: reducedMotion ? 1 : duration, fromYaw: yaw, toYaw, fromPitch: pitch, toPitch };
  }
  const views: Record<ObjectId, { at: THREE.Vector3; yaw: number; pitch: number }> = {
    court: { at: new THREE.Vector3(-3.1, 1.95, 2.8), yaw: .35, pitch: -.04 },
    empire: { at: new THREE.Vector3(-2.9, 1.95, -1.35), yaw: .28, pitch: -.04 },
    jazz: { at: new THREE.Vector3(3.1, 1.95, 2.3), yaw: -.29, pitch: -.04 },
    mirror: { at: new THREE.Vector3(0, 1.95, -1.9), yaw: 0, pitch: .14 },
    door: { at: new THREE.Vector3(4.5, 1.95, -3.6), yaw: -.17, pitch: .02 },
    letter: { at: new THREE.Vector3(3.5, 1.95, 4.6), yaw: -.6, pitch: -.36 },
  };
  let drag: { x: number; y: number; sx: number; sy: number; moved: boolean } | null = null;
  const abort = new AbortController(); const options = { signal: abort.signal };
  renderer.domElement.addEventListener('pointerdown', e => {
    if (!started || paused || e.button !== 0) return;
    transition = null; drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false };
    renderer.domElement.setPointerCapture(e.pointerId);
  }, options);
  renderer.domElement.addEventListener('pointermove', e => {
    if (!drag || paused) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 5) drag.moved = true;
    yaw -= dx * .004; pitch = THREE.MathUtils.clamp(pitch - dy * .003, -.65, .65); drag.x = e.clientX; drag.y = e.clientY;
  }, options);
  renderer.domElement.addEventListener('pointerup', e => {
    if (drag && !drag.moved) {
      const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1), camera);
      let closest: ObjectId | null = null; let score = Infinity;
      for (const [id, target] of Object.entries(targets)) {
        const center = target.clone(); if (['court', 'empire', 'jazz'].includes(id)) center.y = 1.5;
        const distance = ray.ray.distanceToPoint(center);
        if (distance < .8 && distance < score && ray.ray.direction.dot(center.clone().sub(camera.position)) > 0) { score = distance; closest = id as ObjectId; }
      }
      if (closest) onInteract(closest);
    }
    drag = null;
  }, options);
  renderer.domElement.addEventListener('pointercancel', () => { drag = null; }, options);
  window.addEventListener('keydown', e => {
    if (!started || paused || /INPUT|SELECT|TEXTAREA|BUTTON/.test((e.target as HTMLElement).tagName)) return;
    if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) { keys.add(e.key.toLowerCase()); e.preventDefault(); transition = null; }
  }, options);
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()), options);
  window.addEventListener('blur', () => { keys.clear(); drag = null; }, options);
  window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); }, options);
  document.addEventListener('visibilitychange', () => { keys.clear(); }, options);
  const obstacles = [
    { x: -4.5, z: -.65, r: 1.65 }, { x: -3.9, z: -4.8, r: 1.15 }, { x: 4.15, z: -1.2, r: 1.15 },
    { x: -4.7, z: 3, r: 1.6 }, { x: 4.6, z: 3, r: 1.1 },
  ];
  const projected = new THREE.Vector3(); let previous = performance.now();
  renderer.setAnimationLoop(now => {
    if (document.hidden) { previous = now; return; }
    const dt = Math.min((now - previous) / 1000, .05); previous = now;
    if (transition) {
      const t = THREE.MathUtils.clamp((now - transition.start) / transition.duration, 0, 1);
      const smooth = t * t * (3 - 2 * t); camera.position.lerpVectors(transition.from, transition.to, smooth);
      yaw = THREE.MathUtils.lerp(transition.fromYaw, transition.toYaw, smooth); pitch = THREE.MathUtils.lerp(transition.fromPitch, transition.toPitch, smooth);
      if (t === 1) { position.copy(camera.position); transition = null; }
    } else if (started && !paused) {
      const forward = Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'));
      const sideways = Number(keys.has('d')) - Number(keys.has('a'));
      yaw += ((keys.has('arrowleft') ? 1 : 0) - (keys.has('arrowright') ? 1 : 0)) * dt;
      const length = Math.max(1, Math.hypot(forward, sideways)), speed = dt * 2.4;
      const next = position.clone();
      next.x += (-Math.sin(yaw) * forward + Math.cos(yaw) * sideways) * speed / length;
      next.z += (-Math.cos(yaw) * forward - Math.sin(yaw) * sideways) * speed / length;
      next.x = THREE.MathUtils.clamp(next.x, -6.7, 6.7); next.z = THREE.MathUtils.clamp(next.z, -5.7, 6.45);
      for (const o of obstacles) { const dx = next.x - o.x, dz = next.z - o.z, d = Math.hypot(dx, dz); if (d < o.r) { next.x = o.x + dx / Math.max(d, .001) * o.r; next.z = o.z + dz / Math.max(d, .001) * o.r; } }
      position.copy(next); camera.position.copy(position);
    }
    if (started) { camera.rotation.order = 'YXZ'; camera.rotation.set(pitch, yaw, 0); }
    if (!reducedMotion) { mirrorMaterial.uniforms.time.value = now / 1000; dust.rotation.y = Math.sin(now / 180000) * .13; }
    mirrorMaterial.uniforms.awakened.value = THREE.MathUtils.lerp(mirrorMaterial.uniforms.awakened.value, solved ? 1 : 0, .025);
    drawer.position.z = THREE.MathUtils.lerp(drawer.position.z, discoveries.has('jazz') ? -.15 : -.65, reducedMotion ? 1 : .06);
    doorPivot.rotation.y = THREE.MathUtils.lerp(doorPivot.rotation.y, completed ? -1.1 : 0, .035);
    camera.updateMatrixWorld();
    onProject(Object.entries(targets).map(([id, point]) => {
      projected.copy(point).project(camera); const distance = camera.position.distanceTo(point);
      return { id: id as ObjectId, x: (projected.x * .5 + .5) * innerWidth, y: (-projected.y * .5 + .5) * innerHeight,
        visible: started && projected.z < 1 && projected.z > -1 && Math.abs(projected.x) < .95 && Math.abs(projected.y) < .83, distance };
    }));
    renderer.render(scene, camera);
  });
  return {
    enter(immediate = false) { started = true; moveCamera(new THREE.Vector3(0, 1.95, 6.45), 0, -.025, immediate ? 1 : 1600); },
    focus(id) { const v = views[id]; moveCamera(v.at, v.yaw, v.pitch, 900); },
    resetView() { keys.clear(); moveCamera(new THREE.Vector3(0, 1.95, 6.45), 0, -.025); },
    setPaused(value) { paused = value; if (value) { keys.clear(); drag = null; } },
    setProgress(s, c, found) {
      solved = s; completed = c; discoveries = new Set(found);
      hemLabel.visible = discoveries.has('court');
      foldedSketch.visible = discoveries.has('empire');
      danceCard.visible = discoveries.has('jazz');
      signature.visible = discoveries.has('mirror');
    },
    setMotion(value) { reducedMotion = value; },
    setMove(direction, down) { if (paused) return; if (down) { transition = null; keys.add(direction); } else keys.delete(direction); },
    dispose() { abort.abort(); renderer.setAnimationLoop(null); scene.traverse(o => { if (o instanceof THREE.Mesh || o instanceof THREE.Points) { o.geometry.dispose(); const materials = Array.isArray(o.material) ? o.material : [o.material]; materials.forEach(m => m.dispose()); } }); renderer.dispose(); renderer.domElement.remove(); },
  };
}
