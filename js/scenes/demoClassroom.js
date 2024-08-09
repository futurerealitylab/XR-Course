
import { g2 } from "../util/g2.js";
import { uiBox } from "../render/core/UIBox.js";
import { fromValues } from "../third-party/gl-matrix/src/gl-matrix/mat3.js";

export const init = async model => {
   let userid = Math.random();
   let isTeacher = false;
   server.init('classroom', {});  

   function getAnswer(n1, n2, op){
      if(op == '+') return n1+n2;
      if(op == '-') return n1-n2;
      if(op == '*') return n1*n2;
      if(op == '/') return n1/n2;
   }

   class question{
      constructor(n1, n2, op, choices){
         this.n1 = n1;
         this.n2 = n2;
         this.op = op;
         this.answer =getAnswer(this.n1, this.n2, this.op);
         this.choices = choices;
      }
   }


   window.classroom = {
      start: false,
      question: new question(),
      qid:0,
      correctAnswers:0,
      wrongAnswers:0,
      stuSubmitted: false,
      stuanswers: [],
   }

   let panelCube_t = null, panelCube_s = null;
   let panelCover_t = null, panelCover_s = null;
   let teacherBut, studentBut;
   let startClassPrompt = null;
   let newQuestionPrompt = null;
   let choiceBoxes = [];
   panelCube_t = model.add('cube');
   panelCube_s = model.add('cube');
   panelCover_t = model.add('cube');
   panelCover_s = model.add('cube');
   /*
   teacherBut = model.add('cube');
   studentBut = model.add('cube');

   teacherBut = uiBox('button', model,
   () => {
         g2.setColor('#a0ffa0');
   g2.fillRect(0,0,1,1);
         g2.setColor('#000000');
         g2.textHeight(.25); g2.fillText('I\'m\nTeacher', .5,.6, 'center');
      },
      () => setRole(true),
   );
   teacherBut.identity().move(-1.2,1.4,0).scale(.08);

   studentBut = uiBox('button', model,
   () => {
         g2.setColor('#a0a0ff');
   g2.fillRect(0,0,1,1);
         g2.setColor('#000000');
         g2.textHeight(.25); g2.fillText('I\'m\nStudent', .5,.6, 'center');
      },
      () => setRole(false),
   );
   studentBut.identity().move(-.8,1.4,0).scale(.08);   
*/

   startClassPrompt = uiBox('button', model,
      () => {
         g2.setColor('#ffa0a0');
	 g2.fillRect(0,0,1,1);
         g2.setColor('#000000');
         g2.textHeight(.3); g2.fillText('Start', .5,.5, 'center');
      },
      () => startClass(),
   );

   newQuestionPrompt = uiBox('button', model,
      () => {
         g2.setColor('#ffa0a0');
	 g2.fillRect(0,0,1,1);
         g2.setColor('#000000');
         g2.textHeight(.15); g2.fillText('Question', .5,.5, 'center');
      },
      () => nextQuestion(),
   );

   let is = ['A', 'B', 'C', 'D', 'E'];
   choiceBoxes.push(uiBox('button', model,
   () => {
      g2.setColor('#ffa0a0');
      g2.fillRect(0, 0, 1, 1);
      g2.setColor('#000000');
      g2.textHeight(0.4); 
      g2.fillText(is[0], 0.5, 0.5, 'center');
   },
   () => stuSelectChoice(0),
   ));
   choiceBoxes.push(uiBox('button', model,
   () => {
      g2.setColor('#ffa0a0');
      g2.fillRect(0, 0, 1, 1);
      g2.setColor('#000000');
      g2.fillText(is[1], 0.5, 0.5, 'center');
   },
   () => stuSelectChoice(1),
   ));
   choiceBoxes.push(uiBox('button', model,
   () => {
      g2.setColor('#ffa0a0');
      g2.fillRect(0, 0, 1, 1);
      g2.setColor('#000000');
      g2.fillText(is[2], 0.5, 0.5, 'center');
   },
   () => stuSelectChoice(2),
   ));
   choiceBoxes.push(uiBox('button', model,
   () => {
      g2.setColor('#ffa0a0');
      g2.fillRect(0, 0, 1, 1);
      g2.setColor('#000000');
      g2.fillText(is[3], 0.5, 0.5, 'center');
   },
   () => stuSelectChoice(3),
   ));
   choiceBoxes.push(uiBox('button', model,
   () => {
      g2.setColor('#ffa0a0');
      g2.fillRect(0, 0, 1, 1);
      g2.setColor('#000000');
      g2.fillText(is[4], 0.5, 0.5, 'center');
   },
   () => stuSelectChoice(4),
   ));


   function setRole(teacher){
      isTeacher = teacher;
   }

   function serverSendClassroom(){
      console.log("server send");
      server.broadcastGlobal('classroom');
   }
   function startClass(){
      classroom.start = true;
      serverSendClassroom();
   }
   function nextQuestion(){
      classroom.question = getNewQuestion();
      classroom.qid ++;
      classroom.stuanswers = [];
      classroom.correctAnswers = 0;
      classroom.wrongAnswers = 0;
      classroom.stuSubmitted = false;
      serverSendClassroom();
   }

   let ops = ['+','-','*'];
   let cs = [-1,0,1,2, -2];
   function shuffleArray(array) {
      for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
      }
  }
   function getNewQuestion(){
      let n1 = Math.floor( Math.random() * 9 +1 );
      let n2 = Math.floor( Math.random() * 9 +1 );
      let op = ops[Math.floor( Math.random() * 3)];
      let q = new question(n1,n2,op,[]);
      let a = q.answer;
      shuffleArray(cs);
      for(let i=0;i<5;i++){
         q.choices.push(a+cs[i]);
      }

      return q;
   }

   function stuSelectChoice(i){
      classroom.stuSubmitted = true;
      let correct = classroom.question.answer == classroom.question.choices[i];
      if(correct) classroom.correctAnswers++;
      else classroom.wrongAnswers++;
      serverSendClassroom();
   }

   nextQuestion();
   model.animate(() => {
      classroom = server.synchronize('classroom');

      panelCover_t .identity().move(0,1.41,.11).scale(.3,.2,.0001).scale(0).opacity(.5);
      panelCube_t.identity().move(0,1.5,.1).scale(.3,.3,.0001).opacity(.75).texture(() => {
         g2.setColor('#222222');
         g2.fillRect(0,0,1,.7);
         g2.setColor('#ffffff');
         g2.fillRect(.02,.02,.96,.66);
         g2.setColor('#000000');
         g2.textHeight(.05);
         g2.fillText(
            classroom.start?
            `Question `+ classroom.qid +` 

`+classroom.question.n1+classroom.question.op+classroom.question.n2+` = ?`+
`\n\n Student correct answers: `+classroom.correctAnswers+
`\n Student wrong answers: `+classroom.wrongAnswers  
            : 
   `Welcome teacher!

Please click the 'start' button
to start class.
   `, .48, .58, 'center');
      });

      panelCover_s .identity().move(0,1.41,.99).scale(.3,.2,.0001).scale(0);
      panelCube_s.identity().move(0,1.5,1.).scale(.3,.3,.0001).opacity(.75).turnY(1.57).texture(() => {
         g2.setColor('#222222');
         g2.fillRect(0,0,1,.7);
         g2.setColor('#ffffff');
         g2.fillRect(.02,.02,.96,.66);
         g2.setColor('#000000');
         g2.textHeight(.05);
         g2.fillText(
            classroom.start? classroom.stuSubmitted?
            `Answer submitted!

Please wait for the teacher
to start the next question.`:
            `Question `+ classroom.qid +` 

`+classroom.question.n1+classroom.question.op+classroom.question.n2+` = ?`+` 

`+`A. `+classroom.question.choices[0]+
`    B. `+classroom.question.choices[1]+
`    C. `+classroom.question.choices[2]+`
`+
`  D. `+classroom.question.choices[3]+
`    E. `+classroom.question.choices[4]
            : 
   `Welcome student!

Please wait for the teacher
to start class.
   `, .48, .58, 'center');
      });
      
      if(!classroom.start)
         startClassPrompt.update();

      if(classroom.start)
         newQuestionPrompt.update();
      startClassPrompt.identity().move(-.5,1.55,0).scale(.5,.5,.5).scale(classroom.start?0.:.1);
      newQuestionPrompt.identity().move(-.5,1.4,0).scale(classroom.start?.05:0);
      //startClassPrompt.scale(isTeacher?1.:0.);
      //newQuestionPrompt.scale(isTeacher?1.:0.);
   
      for(let i=0;i<choiceBoxes.length;i++){
         if(classroom.start)
         choiceBoxes[i].update();
         choiceBoxes[i].identity().move(-.5+.25*i,1.,1.).scale(classroom.start && !classroom.stuSubmitted?.05:0);
         //choicesBoxes[i].scale(isTeacher?0.:1.);
      }
   });
 }

