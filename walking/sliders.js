let sliderId  = (who, param)        => who + 'sliders_' + param + 'Slider';
let getSlider = (who, param)        => window[sliderId(who, param)].value / 100;
let setSlider = (who, param, value) => window[sliderId(who, param)].value = value * 100;

let createSliders = (who) => {
   let params = window[who].params();
   let s = '';
   for (let i = 0 ; i < params.length ; i++) {
      s += '<tr><td>' + '<input type=range id=' + sliderId(who, params[i]) + '></input>'
	              + params[i].toUpperCase();
   }

   window[who + 'sliders'].innerHTML = '<table id=' + who + 'table>' + s + '</table>';

   setSlider(who, 'color'  , 0);
   setSlider(who, 'go'     , 0);
   setSlider(who, 'looking', 0);
}

let setSlidersBgColor = (who, color) => window[who + 'table'].bgColor = color;

let setParams = who => {
   let person = window[who];
   let params = person.params();
   for (let i = 0 ; i < params.length ; i++)
      person.set(params[i], getSlider(who, params[i]));
}
