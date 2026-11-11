import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clues, rooms, type RoomId } from './content';
import {findRoute,inspectionSpots,roomObstacles,type Point} from './navigation';
export type Guidance={id:string;distance:number;arrived:boolean;screenX:number|null;screenY:number|null};
export type World = ReturnType<typeof createWorld>;
export function createWorld(container: HTMLElement, room: RoomId, callbacks: {
  target: (id: string|null)=>void; interact: (id:string)=>void; exit: ()=>void; pause: ()=>void; failure: ()=>void; step: ()=>void; guidance?:(data:Guidance|null)=>void; notice?:(message:string)=>void;
}) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#141d21');
  scene.fog = new THREE.FogExp2('#172022', .012);
  const touchDevice=matchMedia('(pointer: coarse)').matches;
  const camera = new THREE.PerspectiveCamera(touchDevice?64:58, innerWidth / innerHeight, .08, 55);
  const renderer = new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,touchDevice?1:1.35)); renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=!touchDevice; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.28;
  const canvas=renderer.domElement; canvas.tabIndex=0; canvas.setAttribute('aria-label','3D museum. WASD to walk, mouse to look, E to inspect, J for journal, Escape to pause.'); canvas.style.touchAction='none';container.append(canvas);
  const garmentGroups=new Map<string,THREE.Group>();
  const mat = (color: string, roughness = 0.6, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const gold = mat('#a48148', 0.3, 0.8);
  const brightGold = mat('#dcc28c', 0.25, 0.75);
  const darkGold = mat('#6d5132', 0.4, 0.65);
  const wall = mat(rooms[room].color, 0.82);
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
  box(11.9, 6.5, .3, wall, -2.05, 3.25, -7);
  box(1.9, 6.5, .3, wall, 7.05, 3.25, -7);
  box(2.2, 2.5, .3, wall, 5, 5.25, -7);
  box(16, 6.5, .3, wall, 0, 3.25, 7.5);
  box(2.5, .12, 5, marble, 5, -.04, -9);
  box(.2, 4.2, 5, wall, 3.75, 2.1, -9); box(.2, 4.2, 5, wall, 6.25, 2.1, -9);
  box(2.7, 4.2, .15, wall, 5, 2.1, -11.5);
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
  const sofa = new THREE.Group(); sofa.position.set(-4.7, 0, 3); sofa.rotation.y = .25; scene.add(sofa); sofa.visible = room !== 1 && room !== 3;
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
    const rows = 32, columns = 64, vertices: number[] = [], indices: number[] = [], uvs: number[] = [];
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
    if(type==='court'&&room===1){g.userData.interactive=true;garmentGroups.set('label',g);}
    if(type==='empire'&&(room===0||room===2)){g.userData.interactive=true;garmentGroups.set(room===0?'ivory':'bar',g);}
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
    } else if (type === 'empire' && room >= 2) {
      const skirt = mat('#171b22', .82);
      cloth([[.3,.78,.54],[.6,.75,.51],[1.2,.59,.4],[1.68,.27,.19]], skirt, g, 32, .065);
      cloth([[1.51,.41,.25],[1.75,.24,.17],[2.12,.32,.22],[2.4,.4,.22]], fabric, g, 10, .008);
      for(const side of [-1,1]) { const sleeve= cylinder(.1,.075,.72,fabric,side*.4,2.03,0,g); sleeve.rotation.z=side*.13; }
      for(let i=0;i<4;i++) sphere(.025,darkGold,0,2.15-i*.12,.23,g);
      ringAt(1.75,.25,.18,g,darkGold,.016);
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
  
  const doorPivot = new THREE.Group(); doorPivot.position.set(-1, 0, .07); doorGroup.add(doorPivot);
  box(2, 3.8, .1, panel, 1, 1.9, 0, doorPivot);
  for (const x of [.51, 1.49]) {
    frame(.8, 2.2, x, 2.4, .065, doorPivot); frame(.8, .9, x, .67, .065, doorPivot);
    cylinder(.04, .04, .24, gold, x < 1 ? .9 : 1.1, 1.56, .14, doorPivot);
  }
  for (const x of [-1.13, 1.13]) box(.12, 4.03, .2, gold, x, 2.02, .03, doorGroup);
  box(2.4, .15, .22, gold, 0, 4.04, .03, doorGroup);
  // All textures and furnishings are generated locally; no asset download is required.
  const textures: THREE.Texture[]=[];
  function plaque(lines: string[], w: number,h: number,x: number,y: number,z: number) {
    const c=document.createElement('canvas'); c.width=1024;c.height=768; const ctx=c.getContext('2d')!;
    ctx.fillStyle='#d8caac';ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle='#9d7848';ctx.lineWidth=5;ctx.strokeRect(24,24,976,720);
    ctx.fillStyle='#293d38';ctx.textAlign='center';
    lines.forEach((line,i)=>{ctx.font=i===0?'52px Georgia':'32px Georgia';ctx.fillText(line,512,145+i*105,930);});
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;textures.push(t);
    const p=mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:t,roughness:.9,side:THREE.DoubleSide}),x,y,z);
    return p;
  }
  const wallText=[['LE MOT OUBLIÉ','One piece · one silhouette','Look beyond the surface','A secret waits behind the frame'],['LE RETOUR DE PARIS','A new beginning · 1947','A silhouette transformed','Follow the hidden initials'],['LE SAVOIR-FAIRE','One client · many skilled hands','A promise in every stitch','Look behind the frame'],['LE GRAND RENDEZ-VOUS','Invitations · a seasonal programme','The runway awaits','Look behind the calendar']][room];
  const wallPlaque=plaque(wallText,3.25,2.5,0,3.2,-6.65);frame(3.4,2.65,0,3.2,-6.6);
  const picturePivot=new THREE.Group();picturePivot.position.set(-1.65,3.2,-6.56);picturePivot.userData.interactive=true;scene.add(picturePivot);picturePivot.attach(wallPlaque);
  const pictureClue=room===0?'timeline':room===2?'press':room===3?'calendar':null;
  const hiddenNote=plaque(['✦','A note was hidden here'],.85,.6,-1.35,2.6,-6.61);hiddenNote.visible=false;hiddenNote.userData.interactive=true;
  plaque([String(room+1).padStart(2,'0'),rooms[room].short.toUpperCase()],1.45,.55,5,4.62,-6.64);
  
  const obstacles=roomObstacles(room);
  if(room===0) {
    // Shadowed research shelves, varied book spines and museum storage boxes.
    for(const z of [2.8,-3.7]) {
      const shelf=new THREE.Group();shelf.position.set(-7.35,0,z);shelf.rotation.y=Math.PI/2;scene.add(shelf);
      box(2.4,3.7,.55,wood,0,1.85,0,shelf);
      for(let row=0;row<5;row++) {
        box(2.45,.08,.65,darkGold,0,.25+row*.72,.05,shelf);
        for(let i=0;i<12;i++) { const b=box(.13,.4+(i%3)*.075,.34,mat(['#3b4842','#714c3b','#65614c','#38404b'][i%4]),-1+i*.175,.52+row*.72,.23,shelf); b.rotation.z=(i%4===0?.09:0); box(.1,.015,.015,gold,-1+i*.175,.5+row*.72,.41,shelf); }
      }
    }
  }
  const drawer=new THREE.Group();drawer.position.set(0,.86,.65);scene.add(drawer);drawer.visible=room===1;
  if(room===1) {
    box(3.8,.15,1.8,wood,0,1.12,.1); for(const x of [-1.6,1.6])for(const z of [-.6,.75])box(.12,1.1,.12,darkGold,x,.55,z);
    box(.9,.18,.7,wood,0,0,0,drawer);box(.95,.2,.07,gold,0,0,.38,drawer);sphere(.05,darkGold,0,0,.45,drawer);
    const slip=plaque(['TRANSFER','COLUMN'],.7,.4,0,.98,.65);slip.rotation.x=-Math.PI/2;drawer.attach(slip);
    box(1.3,.02,.9,ivory,-.9,1.21,.1);for(let i=0;i<7;i++)box(.014,.012,.65,darkGold,-1.45+i*.17,1.23,.1);
    for(let i=0;i<6;i++){const roll=cylinder(.15,.15,1.6,mat(['#895862','#c8b69a','#3c5a52'][i%3]),6.8,.85,-3+i*.43);roll.rotation.z=.13;}
    // A treadle sewing machine silhouette, with a hand wheel.
    box(.65,.1,.35,marble,1.05,1.28,.1);box(.12,.4,.2,marble,.82,1.5,.1);box(.5,.1,.2,marble,1,1.73,.1);
    const wheel=mesh(new THREE.TorusGeometry(.18,.025,8,24),gold,1.32,1.6,.1);wheel.rotation.y=Math.PI/2;

  }
  if(room===2) {
    for(const x of [-6,6]){box(1.3,.08,.65,wood,x,.6,-4.7);box(1.3,.85,.1,velvet,x,1,-4.98);for(const dx of [-.5,.5])cylinder(.03,.04,.6,gold,x+dx,.3,-4.5);}
    plaque(['ATELIER','A private commission'],.8,.55,-3.9,.55,-3.95);
  }
  const runwayLights: THREE.SpotLight[]=[];
  if(room===3) {
    box(2.5,.08,10.5,ivory,0,.06,-.3);
    for(const x of [-1.3,1.3])box(.035,.015,10.5,gold,x,.11,-.3);
    for(const side of [-1,1])for(let i=0;i<4;i++) {
      const g=new THREE.Group();g.position.set(side*2.7,0,3.4-i*1.65);g.rotation.y=-side*Math.PI/2;scene.add(g);
      box(.65,.1,.65,velvet,0,.55,0,g);box(.65,.72,.08,velvet,0,.95,-.32,g);
      for(const x of [-.26,.26])for(const z of [-.26,.26])box(.035,.5,.035,gold,x,.25,z,g);

    }
    for(const x of [-2,2]){const light=new THREE.SpotLight('#fff0d3',0,18,.4,.6);light.position.set(x,5.5,1);light.target.position.set(0,1,-2);scene.add(light,light.target);runwayLights.push(light);}
    
    box(.9,.9,.65,wood,-4.5,.45,.65);
  }
  const recoveredCollection=new THREE.Group();scene.add(recoveredCollection);
  // Collection behind the last physical door, seen as its hinges turn.
  if(room===3) {
    for(let i=0;i<3;i++) {
      const g=new THREE.Group();g.position.set(4.3+i*.7,0,-10.5);g.scale.setScalar(.55);recoveredCollection.add(g);
      const fabric=mat(['#b2a3bd','#e3d5b7','#4d6870'][i]);
      cloth([[.2,.65,.45],[1,.5,.3],[1.8,.23,.17],[2.4,.36,.23]],fabric,g,24,.05);cylinder(.08,.1,.24,ivory,0,2.55,0,g);
      cylinder(.7,.7,.1,gold,0,.05,0,g);
    }
  }
  const corridorLight=new THREE.PointLight('#ffdda5',22,8);corridorLight.position.set(5,3,-9);scene.add(corridorLight);
  const lock=box(.38,.55,.09,gold,1.64,1.63,.15,doorPivot);
  for(let i=0;i<3;i++)box(.22,.03,.015,darkGold,1.64,1.5+i*.12,.205,doorPivot);
  const books=new Map<string,{group:THREE.Group;cover:THREE.Group;note:THREE.Mesh}>();
  for(const clue of clues.filter(c=>c.room===room&&c.kind==='document')){
    const g=new THREE.Group();g.userData.interactive=true;g.position.set(clue.position[0],clue.id==='schedule'?.94:.94,clue.position[2]);scene.add(g);
    box(.72,.055,.5,wood,0,0,0,g);box(.66,.055,.45,ivory,0,.052,0,g);
    const cover=new THREE.Group();cover.position.set(-.36,.09,0);g.add(cover);box(.72,.035,.5,mat('#623e36',.7),.36,0,0,cover);box(.5,.008,.32,gold,.36,.022,0,cover);box(.46,.01,.28,wood,.36,.028,0,cover);
    const paper=box(.37,.012,.29,ivory,.1,.11,.02,g);paper.visible=false;books.set(clue.id,{group:g,cover,note:paper});
  }
  // Merge static meshes by material to reduce draw calls on laptop GPUs.
  scene.updateMatrixWorld(true);
  const batches=new Map<THREE.Material,THREE.Mesh[]>();
  scene.traverse(o=>{if(!(o instanceof THREE.Mesh)||o instanceof THREE.InstancedMesh||Array.isArray(o.material))return;
    let ancestor:THREE.Object3D|null=o;while(ancestor){if(ancestor.userData.interactive||ancestor===doorPivot||ancestor===drawer||ancestor===recoveredCollection||!ancestor.visible)return;ancestor=ancestor.parent;}
    const list=batches.get(o.material)||[];list.push(o);batches.set(o.material,list);
  });
  for(const [material,meshes] of batches) {
    if(meshes.length<2)continue;
    const geometries=meshes.map(m=>{let g=m.geometry.clone();if(g.index)g=g.toNonIndexed();g.applyMatrix4(m.matrixWorld);return g;});
    const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());
    if(merged){const m=new THREE.Mesh(merged,material);m.castShadow=true;m.receiveShadow=true;scene.add(m);meshes.forEach(m=>{m.removeFromParent();m.geometry.dispose();});}
  }
  const interactables=new Map<string,THREE.Object3D>();
  for(const [id,b] of books)interactables.set(id,b.group);
  for(const [id,g] of garmentGroups)interactables.set(id,g);
  if(pictureClue)interactables.set(pictureClue,picturePivot);
  if(room===1)interactables.set('transfer',drawer);
  interactables.set('door',doorPivot);
  const targets=clues.filter(c=>c.room===room).map(c=>({id:c.id,point:new THREE.Vector3(...c.position)}));
  targets.push({id:'door',point:new THREE.Vector3(5,1.75,-6.55)});
  let paused=true,unlocked=false,exited=false,cinematic=0,revealing=false,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let yaw=0,pitch=0,sensitivity=1,lookTarget:string|null=null,found=new Set<string>(),moveX=0,moveY=0;
  let guided:{id:string;path:Point[];index:number;arrived:boolean}|null=null;let inspectionFocus:{yaw:number;pitch:number}|null=null;
  const keys=new Set<string>();const position=new THREE.Vector3(0,1.7,6.15);camera.position.set(1.2,3,6.8);camera.lookAt(-.3,2,-2);
  let started=false;const abort=new AbortController();const opts={signal:abort.signal};const ray=new THREE.Raycaster();let footstep=0,previous=performance.now(),lastScan=0,lastNotice=0;
  let drag:{id:number;x:number;y:number;sx:number;sy:number;moved:boolean}|null=null;
  function cancelGuide(){if(guided){guided=null;callbacks.guidance?.(null);}}
  function targetAt(nx=0,ny=0,maxDistance=3.8){camera.updateMatrixWorld();ray.setFromCamera(new THREE.Vector2(nx,ny),camera);
    const hits=targets.flatMap(t=>{const o=interactables.get(t.id);if(!o)return [];o.updateWorldMatrix(true,true);const bounds=new THREE.Box3().setFromObject(o).expandByScalar(.16);const hit=ray.ray.intersectBox(bounds,new THREE.Vector3());return hit&&camera.position.distanceTo(t.point)<=maxDistance?[{id:t.id,distance:camera.position.distanceTo(hit)}]:[];}).sort((a,b)=>a.distance-b.distance);
    if(!hits.length)return null;
    const solids=ray.intersectObjects(scene.children,true).filter(hit=>{if(!(hit.object as THREE.Mesh).isMesh)return false;let p:THREE.Object3D|null=hit.object;while(p){if(!p.visible)return false;p=p.parent;}return true;});
    return hits.find(t=>!solids.length||solids[0].distance+.5>=t.distance)?.id??null;
  }
  function publishGuide(){if(!guided)return;const t=targets.find(t=>t.id===guided!.id);const point=t?.point??new THREE.Vector3(5,1.7,-8.2);const v=point.clone().project(camera);const visible=v.z>-1&&v.z<1&&Math.abs(v.x)<.95&&Math.abs(v.y)<.9;callbacks.guidance?.({id:guided.id,distance:position.distanceTo(point),arrived:guided.arrived,screenX:visible?(v.x+1)*innerWidth/2:null,screenY:visible?(1-v.y)*innerHeight/2:null});}
  function release(){keys.clear();moveX=0;moveY=0;drag=null;if(document.pointerLockElement===canvas)document.exitPointerLock();}
  function guideTo(id:string){if(paused||revealing||cinematic||(id==='exit'&&!unlocked))return;const spot=inspectionSpots[id==='exit'?'door':id];if(!spot)return;release();const path=findRoute({x:position.x,z:position.z},spot,obstacles);if(!path.length){callbacks.notice?.('Move a little away from the furniture, then try Find a clue again.');return;}if(id==='exit')path.push({x:5,z:-6.1},{x:5,z:-8.3});guided={id,path,index:0,arrived:false};lookTarget=null;callbacks.target(null);publishGuide();}
  function requestInteract(id:string){if(paused||revealing||cinematic)return;if(id==='exit'){guideTo(id);return;}const t=targets.find(t=>t.id===id);if(!t)return;if(position.distanceTo(t.point)>3.8){callbacks.notice?.('Walking closer. When you arrive, tap Open clue.');guideTo(id);return;}cancelGuide();callbacks.interact(id);}
  function aim(dx:number,dy:number){cancelGuide();yaw-=dx*.003*sensitivity;pitch=THREE.MathUtils.clamp(pitch-dy*.003*sensitivity,-1.2,1.2);}
  canvas.addEventListener('pointerdown',e=>{if(paused||revealing||cinematic||e.button>0)return;canvas.focus();drag={id:e.pointerId,x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);},opts);
  canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId||paused||revealing||document.pointerLockElement===canvas)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>7)drag.moved=true;if(drag.moved)aim(dx,dy);drag.x=e.clientX;drag.y=e.clientY;},opts);
  canvas.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const tapped=!drag.moved;drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(tapped&&!paused&&!revealing){const rect=canvas.getBoundingClientRect();const id=document.pointerLockElement===canvas?targetAt(0,0,30):targetAt((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1,30);if(id)requestInteract(id);else if(performance.now()-lastNotice>4000){lastNotice=performance.now();callbacks.notice?.('Need help? Tap Find a clue to walk to an object you can open.');}}},opts);
  canvas.addEventListener('pointercancel',()=>{drag=null;},opts);
  document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&!paused&&!revealing)aim(e.movementX,e.movementY);},opts);
  window.addEventListener('keydown',e=>{if(paused||revealing||/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){cancelGuide();keys.add(e.code);e.preventDefault();}if(e.code==='KeyE'&&!e.repeat){const id=targetAt();if(id)requestInteract(id);}},opts);
  window.addEventListener('keyup',e=>keys.delete(e.code),opts);
  window.addEventListener('blur',()=>{release();cancelGuide();},opts);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){release();cancelGuide();}},opts);
  document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&started&&!paused&&!cinematic){keys.clear();callbacks.pause();}},opts);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();release();paused=true;callbacks.failure();},opts);
  window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);},opts);
  const collides=(x:number,z:number)=>obstacles.some(o=>Math.abs(x-o.x)<o.rx&&Math.abs(z-o.z)<o.rz);
  renderer.setAnimationLoop(now=>{
    const dt=Math.min((now-previous)/1000,.05);previous=now;if(document.hidden)return;
    if(started&&!paused&&!cinematic&&!revealing){
      let dx=0,dz=0,moving=false;
      if(guided&&!guided.arrived){const to=guided.path[guided.index];const distance=Math.hypot(to.x-position.x,to.z-position.z);if(distance<.09){guided.index++;if(guided.index>=guided.path.length)guided.arrived=true;}
        else{const travel=Math.min(distance,2.7*dt);dx=(to.x-position.x)/distance*travel;dz=(to.z-position.z)/distance*travel;const direction=Math.atan2(-dx,-dz);yaw+=Math.atan2(Math.sin(direction-yaw),Math.cos(direction-yaw))*Math.min(1,dt*6);pitch=THREE.MathUtils.damp(pitch,0,5,dt);moving=true;}}
      else if(!guided){const f=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'))+moveY;const s=Number(keys.has('KeyD'))-Number(keys.has('KeyA'))+moveX;yaw+=(Number(keys.has('ArrowLeft'))-Number(keys.has('ArrowRight')))*dt*1.3;const speed=2.7*dt/Math.max(1,Math.hypot(f,s));dx=(-Math.sin(yaw)*f+Math.cos(yaw)*s)*speed;dz=(-Math.cos(yaw)*f-Math.sin(yaw)*s)*speed;moving=!!(f||s);}
      if(guided?.arrived){const t=targets.find(t=>t.id===guided!.id);if(t){const d=t.point.clone().sub(position);const direction=Math.atan2(-d.x,-d.z);yaw+=Math.atan2(Math.sin(direction-yaw),Math.cos(direction-yaw))*Math.min(1,dt*7);pitch=THREE.MathUtils.damp(pitch,Math.atan2(d.y,Math.hypot(d.x,d.z)),7,dt);}}
      const nx=THREE.MathUtils.clamp(position.x+dx,-6.8,6.8);if(!collides(nx,position.z))position.x=nx;
      const portal=unlocked&&doorPivot.rotation.y<-.95&&position.x>4.35&&position.x<5.65;const nz=THREE.MathUtils.clamp(position.z+dz,portal?-9:-6.25,6.75);if(!collides(position.x,nz))position.z=nz;
      camera.position.copy(position);if(!reduced&&moving)camera.position.y+=Math.sin(now*.012)*.012;camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);
      if(moving&&now-footstep>480){footstep=now;callbacks.step();}if(now-lastScan>100){lastScan=now;const id=guided?.arrived&&guided.id!=='exit'?guided.id:targetAt();if(id!==lookTarget){lookTarget=id;callbacks.target(id);}publishGuide();}
      if(position.z< -7.8&&!exited){exited=true;cancelGuide();callbacks.exit();}
    }
    if(revealing&&inspectionFocus){const f=inspectionFocus;yaw+=Math.atan2(Math.sin(f.yaw-yaw),Math.cos(f.yaw-yaw))*Math.min(1,dt*6);pitch=THREE.MathUtils.damp(pitch,f.pitch,6,dt);camera.rotation.set(pitch,yaw,0);}
    doorPivot.rotation.y=THREE.MathUtils.damp(doorPivot.rotation.y,unlocked?-1.45:0,reduced?100:3,dt);lock.position.y=THREE.MathUtils.damp(lock.position.y,unlocked?1.48:1.63,5,dt);
    drawer.position.z=THREE.MathUtils.damp(drawer.position.z,found.has('transfer')?.99:.65,reduced?100:7,dt);
    for(const [id,b] of books){const opened=found.has(id);b.cover.rotation.z=THREE.MathUtils.damp(b.cover.rotation.z,opened?1.75:0,reduced?100:7,dt);b.note.visible=opened;b.note.position.x=THREE.MathUtils.damp(b.note.position.x,opened?.28:.1,reduced?100:7,dt);}
    picturePivot.rotation.y=THREE.MathUtils.damp(picturePivot.rotation.y,pictureClue&&found.has(pictureClue)?-.32:0,reduced?100:7,dt);hiddenNote.visible=!!pictureClue&&found.has(pictureClue);hiddenNote.position.x=THREE.MathUtils.damp(hiddenNote.position.x,hiddenNote.visible?-1.95:-1.35,reduced?100:7,dt);
    for(const [id,g]of garmentGroups)g.rotation.y=THREE.MathUtils.damp(g.rotation.y,found.has(id)?.38:.08,reduced?100:7,dt);
    if(cinematic){const t=Math.min((now-cinematic)/5500,1);camera.position.set(Math.sin(t*.65)*2,2.1+t*.6,5.8-t*2.7);camera.lookAt(0,1.7,-3);runwayLights.forEach(l=>l.intensity=THREE.MathUtils.damp(l.intensity,130,2,dt));}
    renderer.render(scene,camera);
  });
  return {
    start(){started=true;camera.position.copy(position);camera.rotation.order='YXZ';camera.rotation.set(0,0,0);},
    pause(value:boolean){paused=value;lookTarget=null;if(value){cancelGuide();release();callbacks.target(null);}else canvas.focus();},
    requestLook(){canvas.focus();if(!touchDevice&&canvas.requestPointerLock)canvas.requestPointerLock()?.catch(()=>{});},
    guideTo,cancelGuide,requestInteract,
    setMove(x:number,y:number){if(x||y)cancelGuide();if(paused||revealing){moveX=0;moveY=0;return;}moveX=THREE.MathUtils.clamp(x,-1,1);moveY=THREE.MathUtils.clamp(y,-1,1);},
    async animateClue(id:string){if(revealing)return;cancelGuide();revealing=true;release();callbacks.target(null);found.add(id);const t=targets.find(t=>t.id===id);if(t){const d=t.point.clone().sub(position);inspectionFocus={yaw:Math.atan2(-d.x,-d.z),pitch:Math.atan2(d.y,Math.hypot(d.x,d.z))};camera.rotation.order='YXZ';}await new Promise(r=>setTimeout(r,reduced?100:800));revealing=false;inspectionFocus=null;lookTarget=null;},
    progress(open:boolean,ids:string[]){unlocked=open;found=new Set(ids);},
    settings(quality:string,motion:boolean,sens:number){reduced=motion;sensitivity=sens;renderer.setPixelRatio(quality==='low'?1:Math.min(devicePixelRatio,touchDevice?1.25:1.6));renderer.shadowMap.enabled=quality!=='low';renderer.setSize(innerWidth,innerHeight);},
    reveal(){paused=true;release();cinematic=performance.now();sofa.visible=false;recoveredCollection.children.forEach((g,i)=>{g.position.set((i-1)*1.2,.12,-2.6-Math.abs(i-1)*1.2);g.scale.setScalar(1);});},
    dispose(){abort.abort();paused=true;release();renderer.setAnimationLoop(null);const gs=new Set<THREE.BufferGeometry>(),ms=new Set<THREE.Material>();scene.traverse(o=>{if(o instanceof THREE.Mesh){gs.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>ms.add(m));}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();canvas.remove();},
  };
}
