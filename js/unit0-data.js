/* Unit 0 question bank: planes, axes, joint actions.
 * Plane choices always appear in the same order so position never gives
 * the answer away and the three names stay anchored to one another.
 */
(function () {
  'use strict';
  var P = ['Sagittal', 'Frontal', 'Transverse'];
  var SAG = 0, FRO = 1, TRA = 2;
  var AX = ['Mediolateral (M-L) axis', 'Anteroposterior (A-P) axis', 'Longitudinal (vertical) axis'];

  var why = {
    sag: 'Sagittal plane: forward/back movement around a side-to-side (M-L) axis. The limb could slide along a wall beside you without leaving it.',
    fro: 'Frontal plane: side-to-side movement around a front-to-back (A-P) axis. Two panes of glass, one at your chest and one at your back, would never be touched.',
    tra: 'Transverse plane: rotation around a vertical (longitudinal) axis, like a turntable or a revolving door.'
  };

  function anim(id, mv, plane, extra) {
    return { id: 'u0-anim-' + id, movement: mv, prompt: 'Watch the highlighted body part. Which plane is this movement in? (Drag to rotate; try the Front and Side views.)',
      choices: P, answer: plane, explain: (extra ? extra + ' ' : '') + why[['sag', 'fro', 'tra'][plane]], tag: 'anim' };
  }

  var ITEMS = [
    anim('sh-abd', 'sh-abd', FRO, 'Shoulder abduction: the arm rises out to the side.'),
    anim('hip-flex', 'hip-flex', SAG, 'Hip flexion: the thigh comes forward.'),
    anim('hip-med-rot', 'hip-med-rot', TRA, 'Hip medial rotation: the whole leg spins so the toes turn in.'),
    anim('lat-flex', 'lat-flex', FRO, 'Trunk lateral flexion: bending sideways.'),
    anim('sh-hz-abd', 'sh-hz-abd', TRA, 'Shoulder horizontal abduction. It is called abduction, but the arm starts raised forward, so it now sweeps in a horizontal slice. The start position changes the plane.'),
    anim('invert', 'invert', FRO, 'Inversion: the sole turns to face the midline. (Real inversion runs about an oblique axis, but it is mostly frontal plane.)'),
    anim('knee-flex', 'knee-flex', SAG, 'Knee flexion: the heel goes back toward the buttock.'),
    anim('trunk-rot', 'trunk-rot', TRA, 'Trunk rotation: the shoulders turn over the hips.'),
    anim('hip-abd', 'hip-abd', FRO, 'Hip abduction: the leg goes out to the side.'),
    anim('dorsi', 'dorsi', SAG, 'Dorsiflexion: toes come up toward the shin.'),

    { id: 'u0-name-fro', prompt: 'The frontal plane gets its name because...', choices: [
      'Movement in it goes from front to back',
      'It slices the body into a front part and a back part',
      'It sits at the front of the body',
      'You face it when you look in a mirror'
    ], answer: 1, explain: 'A plane is named for the SLICE it makes, not for the movement in it. The frontal plane slices front from back, so movement inside it can only go side to side. The name and the movement point in different directions; that crossed wiring is the whole trap.' },

    { id: 'u0-glass', prompt: 'You stand between two panes of glass: one touching your chest, one touching your back. Which movement can you do <em>without touching the glass</em>?', choices: [
      'Raise your arm straight forward',
      'Kick your leg forward',
      'Raise your arm out to the side',
      'Bow forward at the waist'
    ], answer: 2, explain: 'The panes are frontal planes. Anything that stays between them is a frontal-plane movement: side to side only. Forward arm raises, kicks and bows all hit the front pane (sagittal plane).' },

    { id: 'u0-slice-fro', prompt: 'A cut in the <strong>frontal</strong> plane separates the body into...', choices: ['Left and right', 'Front and back', 'Upper and lower', 'Inside and outside'], answer: 1, explain: 'Frontal (coronal) = anterior and posterior parts. OpenStax 1.6.' },
    { id: 'u0-slice-sag', prompt: 'A cut in the <strong>sagittal</strong> plane separates the body into...', choices: ['Left and right', 'Front and back', 'Upper and lower', 'Inside and outside'], answer: 0, explain: 'Sagittal = left and right. Through the midline it is midsagittal; off-centre it is parasagittal. OpenStax 1.6.' },
    { id: 'u0-slice-tra', prompt: 'A cut in the <strong>transverse</strong> plane separates the body into...', choices: ['Left and right', 'Front and back', 'Upper and lower', 'Inside and outside'], answer: 2, explain: 'Transverse (horizontal) = superior and inferior parts. Medical scans call these cross sections. OpenStax 1.6.' },

    { id: 'u0-axis-fro', prompt: 'Movement in the <strong>frontal</strong> plane rotates around which axis?', choices: AX, answer: 1, explain: 'The axis is always perpendicular to the plane, like a door hinge is perpendicular to the door’s swing. Frontal-plane movement spins around a skewer running front to back (A-P).' },
    { id: 'u0-axis-sag', prompt: 'Movement in the <strong>sagittal</strong> plane rotates around which axis?', choices: AX, answer: 0, explain: 'Sagittal movement (flexion and extension) spins around a skewer running side to side (M-L), like a pin through both hip joints. Some texts call this the "frontal axis" because it lies in the frontal plane; that name is a trap, so this course uses M-L.' },
    { id: 'u0-axis-tra', prompt: 'Movement in the <strong>transverse</strong> plane rotates around which axis?', choices: AX, answer: 2, explain: 'Rotation in a horizontal slice spins around a vertical skewer, like a turntable spindle.' },

    { id: 'u0-term-abd', prompt: 'Abduction and adduction of the hip happen in which plane (from anatomical position)?', choices: P, answer: FRO, explain: 'Abduction = away from the midline; adduction = toward it. From anatomical position that is side to side: frontal. OpenStax 9.5 places abduction/adduction in the coronal (frontal) plane.' },
    { id: 'u0-term-hz', prompt: 'Horizontal abduction of the shoulder happens in which plane?', choices: P, answer: TRA, explain: 'Horizontal abduction starts with the arm raised forward to 90 degrees, so the arm sweeps through a horizontal slice. Same word "abduction", different start position, different plane. Remember this pattern: it comes back in Part 2 (piriformis, adductors).' },
    { id: 'u0-term-pron', prompt: 'Forearm pronation (palm turning from forward-facing to backward-facing) happens in which plane?', choices: P, answer: TRA, explain: 'Pronation spins the radius around the forearm’s long axis. In anatomical position the forearm is vertical, so that is a longitudinal axis and a transverse plane.' },
    { id: 'u0-term-knee', prompt: 'Knee flexion brings the heel toward the buttock. Elbow flexion brings the hand toward the shoulder. These two flexions...', choices: [
      'Are in different planes',
      'Are both sagittal, but the limb moves in opposite directions (forward vs backward)',
      'Are both frontal',
      'Are only sagittal when you are lying down'
    ], answer: 1, explain: 'Both are sagittal-plane flexion. The forearm swings forward but the lower leg swings backward, a flagged exception that comes from how the limbs rotate during development. "Flexion" is defined by the joint, not by "forward".' },

    { id: 'u0-app-sprint', prompt: 'Sprinting: the thigh driving forward and up during the swing phase is mainly...', choices: P, answer: SAG, explain: 'Hip flexion: sagittal. Most of sprinting’s propulsion is sagittal; the frontal and transverse planes are about control and efficiency.' },
    { id: 'u0-app-drop', prompt: 'Running: the pelvis dropping on the swing-leg side while you stand on one leg is a movement in which plane?', choices: P, answer: FRO, explain: 'The pelvis tilts side to side (one hip lower than the other): frontal plane. Glute med and min resist this drop on the stance side. That job returns when we study them.' },
    { id: 'u0-app-shuffle', prompt: 'A defensive side-shuffle, legs pushing apart and coming together, is mainly...', choices: P, answer: FRO, explain: 'Hip abduction and adduction: frontal plane.' },
    { id: 'u0-app-throw', prompt: 'Turning the torso to wind up for a throw is mainly...', choices: P, answer: TRA, explain: 'Trunk rotation around a vertical axis: transverse.' },
    { id: 'u0-app-sit', prompt: 'Standing up from a chair (hips and knees extending) is mainly...', choices: P, answer: SAG, explain: 'Hip and knee extension, plus ankle movement: all sagittal.' },
    { id: 'u0-app-jj', prompt: 'A jumping jack (arms and legs out to the sides and back) is mainly...', choices: P, answer: FRO, explain: 'Shoulder and hip abduction then adduction: the classic frontal-plane exercise. Picture doing it between the two panes of glass.' },
    { id: 'u0-app-lj', prompt: 'Long jump: at take-off the free leg’s knee drives up in front of you. That knee drive is mainly...', choices: P, answer: SAG, explain: 'Hip flexion of the free leg: sagittal.' }
  ];

  window.BP = window.BP || {};
  window.BP.unit0 = { ITEMS: ITEMS, PLANES: P };
})();
