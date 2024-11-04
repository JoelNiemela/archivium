if (!window.createElement) throw 'domUtils.js not loaded!';

(function() {
  function getYearValue() {
    const { Year } = this.time;
    if (Year % 4 === 0 && (Year % 100 !== 0 || Year % 400 === 0)) return 316224000;
    else return 315360000;
  }
  function getMonthValue() {
    const { Month } = this.time;
    if (Month === 2) return getYearValue.apply(this) === 316224000 ? (29 * 864000) : (28 * 864000);
    else if (Month === 4 || Month === 6 || Month === 9 || Month === 11) return 30 * 864000;
    else return 31 * 864000;
  }

  class CalendarPicker {
    constructor() {
      this.defaults = {
        Year: 0,
        Month: 1,
        Day: 1,
        Hour: 0,
        Minute: 0,
        Second: 0,
      };

      this.reset();

      this.evals = {
        Year: getYearValue.bind(this),
        Month: getMonthValue.bind(this),
        Day: () => 864000,
        Hour: () => 36000,
        Minute: () => 600,
        Second: () => 10,
      };

      this.fields = [];
      this.inputs = {};
      for (const key in this.time) {
        const input = createElement('input', { attrs: { onchange: ({ target }) => { this.time[key] = Number(target.value) } } });
        this.fields.push(createElement('div', { children: [
          createElement('label', { attrs: { innerText: `${T(key)}: ` } }),
          input,
        ] }));
        this.inputs[key] = input;
      }
    }

    update() {
      for (const key in this.time) {
        this.inputs[key].value = this.time[key];
      }
    }

    reset() {
      this.time = { ...this.defaults };
    }

    setTime(abstime) {
      this.reset();
      let curTime = abstime;
      for (const key in this.time) {
        while (curTime >= this.evals[key]()) {
          curTime -= this.evals[key]();
          this.time[key] += 1;
        }
      }
      this.update();
    }

    getAbsTime() {
      let abstime = 0;
      for (const key in this.time) {
        while (this.time[key] > this.defaults[key]) {
          this.time[key] -= 1;
          abstime += this.evals[key]();
        }
      }
      this.setTime(abstime);

      return abstime;
    }
  }

  window.CalendarPicker = CalendarPicker;
})();