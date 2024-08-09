const octaveWidth = 6.47 * 0.0254;
const kbdHeight   = 31   * 0.0254;

let now = () => Date.now() - 1699000000000;

const notes = `\
c3,c-3,d3,d-3,e3,f3,f-3,g3,g-3,a4,a-4,b4,\
c4,c-4,d4,d-4,e4,f4,f-4,g4,g-4,a5,a-5,b5,\
c5`.split(',');

const sound = [];
for (let i = 0 ; i < notes.length ; i++)
   (sound[i] = new Audio()).src = '../../media/sound/pianoNotes/' + notes[i] + '.mp3';

server.init('noteData', {});

let playNote = i => {
   sound[i].play();
   server.send('noteData', {i: i, t: now()});
}

let stopNote = i => {
   sound[i].pause();
   sound[i].currentTime = 0;
}

if (navigator.requestMIDIAccess)
  navigator.requestMIDIAccess().then(midi => {
     let inputs = midi.inputs.values();
     for (let input = inputs.next(); input && !input.done; input = inputs.next())
        input.value.onmidimessage = message => {
           let action = message.data[0];
           let pitch  = message.data[1];
           if (pitch >= 48 && pitch < 48 + notes.length) {
              if (action == 144) playNote(pitch - 48);
              if (action == 128) stopNote(pitch - 48);
           }
        }
  });

window.noteData = {};
let noteData_id = 0;

let keyPosition = i => [(i-12)/12 * octaveWidth, kbdHeight, 0];

let d = 8;
let colors = [
   [1.    , 0.    , 0.    ], // C
   [1.  /d, 0.15/d, 0.    ],
   [1.    , 0.3   , 0.    ], // D
   [1.  /d, 0.65/d, 0.    ],
   [1.    , 1.    , 0.    ], // E
   [0.    , 1.    , 0.    ], // F
   [0.    , 0.75/d, 0.    ],
   [0.    , 0.5   , 1.    ], // G
   [0.25/d, 0.25/d, 1.  /d],
   [0.5   , 0.    , 1.    ], // A
   [0.75/d, 0.    , 0.75/d],
   [1.    , 0.    , 0.5   ], // B
];

let hands = {left:null, right:null};

export const init = async model => {
   model.animate(() => {
      server.sync('noteData', values => {
         for (let id in values)
            noteData[noteData_id++] = values[id];
      });

      for (let hand in hands)
         clay.handsWidget.visible(hand, (inputEvents.pos(hand)[1] - (kbdHeight + .02)) / .1);

      while (model.nChildren() > 0)
         model.remove(0);
      for (let id in noteData) {
	 let p = keyPosition(noteData[id].i);
	 let age = (now() - noteData[id].t) / 1000;
	 model.add('cube').identity()
	                  .move(p[0], p[1] + .03 * age, p[2])
	                  .scale(.006)
	                  .color(colors[noteData[id].i % 12]);
	 if (age > 30)
	    delete noteData[id];
      }
   });
}

