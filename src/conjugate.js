class Options {
    constructor(elementToHideAndShow, container) {
        this.elementToHideAndShow = elementToHideAndShow;
        this.container = container;

        this.read();

        if (!this.activeMoodsAndTenses) {
            this.activeMoodsAndTenses = Array(Conjugate.moodsAndTenses.length);
            this.activeMoodsAndTenses.fill(true);
        }

        if (!this.timeout) {
            this.timeout = 20 * 1000; // 20 seconds
        }

        this.buildOptionsDialog();
    }

    moodAndTenseChanged(index, event) {
        var event = Conjugate.getEvent(event);
        this.activeMoodsAndTenses[index] = event.target.checked;
    }

    hide() {
        this.elementToHideAndShow.style.display = "none";
        this.write();
    }

    show() {
        this.elementToHideAndShow.style.display = "block";
    }

    buildOptionsDialog() {
        var self = this;
        function addMood(mood) {
            var outerDiv = document.createElement('div');
            outerDiv.className = "mood_section";

            var header = document.createElement("h2");
            header.innerText = mood;
            outerDiv.appendChild(header);

            Conjugate.moodsAndTenses.forEach(function(moodAndTense, index) {
                if (!moodAndTense.includes(mood)) {
                    return;
                }

                var check = document.createElement('input');
                check.type = 'checkbox';
                if (self.activeMoodsAndTenses[index])
                    check.checked = 'true';

                check.addEventListener("change", self.moodAndTenseChanged.bind(self, index));

                outerDiv.appendChild(check);
                outerDiv.appendChild(document.createTextNode(moodAndTense[1]));

                outerDiv.appendChild(document.createElement('br'));
            });
            return outerDiv;
        }

        var moodAndTensesContainer = document.createElement('div');
        moodAndTensesContainer.className = "mood_and_tenses";
        moodAndTensesContainer.appendChild(addMood("")); // Indicative
        moodAndTensesContainer.appendChild(addMood("Subjunctive"));
        moodAndTensesContainer.appendChild(addMood("Imperative"));
        this.container.appendChild(moodAndTensesContainer);

        var closeButton = document.createElement("input");
        closeButton.type = "button";
        closeButton.value = "Close";
        closeButton.addEventListener("click", self.hide.bind(self));
        this.container.appendChild(closeButton);
    }

    write() {
        localStorage.setItem("activeMoodsAndTenses", JSON.stringify(this.activeMoodsAndTenses));
        localStorage.setItem("timeout", JSON.stringify(this.timeout));
    }

    read() {
        function readAndTryToParse(key) {
            var value = localStorage.getItem(key);
            if (!value)
                return null;
            try {
                return JSON.parse(value);
            } catch (error) {
                return null;
            }
        }

        var activeMoodsAndTenses = readAndTryToParse("activeMoodsAndTenses");
        if (activeMoodsAndTenses)
            this.activeMoodsAndTenses = activeMoodsAndTenses;
        var timeout = readAndTryToParse("timeout");
        if (timeout)
            this.timeout = timeout;
    }
}

class Round {
    constructor(options) {
        this.options = options;
        this.currentConjugationIndex = 0;

        var verb = Round.randomVerb();
        var verbArray = __WORDS__[verb];

        var moodAndTense = this.randomMoodAndTense();
        this.title = verb;
        this.subtitle = moodAndTense;

        this.conjugations = [];
        var shuffledPersonAndNumber = Conjugate.shuffledPersonAndNumber();
        var shuffledPersonAndNumber = shuffledPersonAndNumber.filter(function(personAndNumber) {
            return Conjugate.getConjugation(verb, moodAndTense, personAndNumber) != "";
        });

        var totalConjugations = 3;
        for (var i = 0; i < totalConjugations && i < shuffledPersonAndNumber.length; i++) {
            this.conjugations.push({
                prompt: shuffledPersonAndNumber[i],
                answer: Conjugate.getConjugation(verb, moodAndTense, shuffledPersonAndNumber[i]),
            });
        }
    }

    static randomVerb() {
        var keys = Object.keys(__WORDS__);
        return keys[Math.floor(Math.random() * keys.length)];
    }

    randomMoodAndTense() {
        var moodsAndTenses = [];
        this.options.activeMoodsAndTenses.forEach(function(active, index) {
            if (active)
                moodsAndTenses.push(Conjugate.moodsAndTenses[index]);
        });
        return moodsAndTenses[Math.floor(Math.random() * moodsAndTenses.length)];
    }

    nextConjugation() {
        if (this.currentConjugation >= this.conjugations.length)
            return null;

        var conjugation = this.conjugations[this.currentConjugationIndex];
        this.currentConjugationIndex++;
        return conjugation;
    }
}

class Conjugate {
    constructor(options,
                inputBoxElement,
                correctAnswerBoxElement,
                titleElement,
                subtitleElement,
                conjugationTextElement,
                timerFillElement,
                roundDialogElement,
                roundDialogWrapper) {

        this.options = options;

        this.inputBoxElement = inputBoxElement;
        this.correctAnswerBoxElement = correctAnswerBoxElement;
        this.titleElement = titleElement;
        this.subtitleElement = subtitleElement;
        this.conjugationTextElement = conjugationTextElement;
        this.timerFillElement = timerFillElement;
        this.roundDialogElement = roundDialogElement;
        this.roundDialogWrapper = roundDialogWrapper;

        this.round = null;
        this.roundDialogOpen = false;
        this.inTestingMode = false;
        this.animationFrame = null;
        this.animationStart = null;

        var keyHandler = this.keyPress.bind(this);
        this.inputBoxElement.addEventListener("keypress", keyHandler, false);
        document.body.addEventListener("keypress", keyHandler, false);
    }

    generateRandomConjugationTest() {
    }

    startTesting() {
        if (this.animationFrame !== null)
            cancelAnimationFrame(this.animationFrame);

        this.animationHandler = function(timestamp) {
            if (this.animationStart == null) {
                this.animationStart = timestamp;
            }

            var percentDone =
                Math.min(((timestamp - this.animationStart) / Conjugate.timeout) * 100, 100);
            this.timerFillElement.style.width = (100 - percentDone) + "%";

            //if (percentDone == 100) {
            //    this.checkConjugation();
            //    return;
            //}

            this.animationFrame = requestAnimationFrame(this.animationHandler);
        }.bind(this);

        this.animationStart = null;
        this.animationFrame = requestAnimationFrame(this.animationHandler);
        this.inTestingMode = true;
    }

    animationTick() {

    }

    stopTesting() {
        if (this.animationFrame !== null)
            cancelAnimationFrame(this.animationFrame);
        this.inTestingMode = false;
    }

    buildRoundDialog() {
        if (this.roundTitleElement !== undefined)
            return;

        var element = document.createElement('h1');
        element.innerText = "New Round";
        this.roundDialogElement.appendChild(element);

        var innerElement = document.createElement('div');
        this.roundDialogElement.appendChild(innerElement);

        this.roundTitleElement = document.createElement('h2');
        innerElement.appendChild(this.roundTitleElement);

        var element = document.createElement('div');
        element.innerText = "in the";
        innerElement.appendChild(element);

        this.roundSubtitleElement = document.createElement('h3');
        innerElement.appendChild(this.roundSubtitleElement);

        var closeButton = document.createElement("input");
        closeButton.type = "button";
        closeButton.value = "Start Round!";
        closeButton.addEventListener("click", this.closeRoundDialog.bind(this));
        innerElement.appendChild(closeButton);
    }

    closeRoundDialog() {
        this.roundDialogOpen = false;
        this.roundDialogWrapper.style.display = "none";
        this.inputBoxElement.focus();
    }

    startRound() {
        this.round = new Round(this.options);
        this.titleElement.innerText = this.round.title;
        this.subtitleElement.innerText = this.round.subtitle;

        this.buildRoundDialog();
        this.roundTitleElement.innerText = this.round.title;
        this.roundSubtitleElement.innerText = this.round.subtitle;
        this.roundDialogWrapper.style.display = "block";
        this.roundDialogOpen = true;
    }

    chooseNewConjugation() {
        if (this.round == null)
            this.startRound();

        var conjugation = this.round.nextConjugation();
        if (conjugation == null) {
            this.startRound();
            conjugation = this.round.nextConjugation();
        }

        this.conjugationTextElement.innerHTML = conjugation.prompt;
        window.__ANSWER__ = conjugation.answer;
        console.log(conjugation.answer);

        this.inputBoxElement.innerText = "";
        this.inputBoxElement.className = "wordbox noanswer";
        this.conjugationTextElement.className = "noanswer";
        this.inputBoxElement.setAttribute('contenteditable', 'true');
        this.inputBoxElement.focus();

        this.correctAnswerBoxElement.innerText = "blank";
        this.correctAnswerBoxElement.style.visibility = "hidden";

        this.startTesting();
    }

    checkConjugation() {
        if (this.inputBoxElement.innerText == __ANSWER__) {
            this.inputBoxElement.className = "wordbox correct phaseout";
            this.conjugationTextElement.className = "correct";
        } else {
            this.inputBoxElement.className = "wordbox incorrect phaseout";
            this.conjugationTextElement.className = "incorrect";
            this.correctAnswerBoxElement.innerText = __ANSWER__;
            this.correctAnswerBoxElement.style.visibility = "";
        }
        this.inputBoxElement.removeAttribute('contenteditable');

        this.stopTesting();
    }

    static getEvent(event) {
        if (!event)
            return window.event;
        return event;
    }

    keyPress(event) {
        var event = Conjugate.getEvent(event);
        if (event.keyCode == 13) {
            event.preventDefault();
            event.stopPropagation();
 
            if (this.roundDialogOpen) {
                this.closeRoundDialog();
                return;
            }

            if (!this.inTestingMode) {
                this.chooseNewConjugation();
                return;
            }

            this.checkConjugation();
        }

        return false;
    }

    static start() {
        var options = new Options(document.getElementById('options_wrapper'),
                                  document.getElementById('options'));
        Conjugate.__instance__ = new Conjugate(
            options,
            document.getElementById('inputbox'),
            document.getElementById('answerbox'),
            document.getElementById('round_title'),
            document.getElementById('round_subtitle'),
            document.getElementById('conjugation'),
            document.getElementById('timerguts'),
            document.getElementById('round_dialog'),
            document.getElementById('round_dialog_wrapper'));
        Conjugate.__instance__.chooseNewConjugation();
    }

    static showOptions() {
        Conjugate.__instance__.options.show();
    }

    static getConjugation(verb, moodAndTense, personAndNumber) {
        var verbArray = __WORDS__[verb];
        var moodAndTenseIndex = Conjugate.moodsAndTenses.indexOf(moodAndTense);
        var personAndNumberIndex = Conjugate.personAndNumber.indexOf(personAndNumber);
        return verbArray[1 + (moodAndTenseIndex * 6) + personAndNumberIndex];
    }

    static shuffledPersonAndNumber() {
        var shuffledArray = Conjugate.personAndNumber.slice();
        for (var i = shuffledArray.length - 1; i >= 0; i--) {
            var indexToSwap = Math.floor(Math.random() * i);
            var temp = shuffledArray[i];
            shuffledArray[i] = shuffledArray[indexToSwap];
            shuffledArray[indexToSwap] = temp;
        }
        return shuffledArray;
    }
}

Conjugate.timeout = 20 * 1000; // 5 seconds
Conjugate.moodsAndTenses = [
    "Present",
    "Future",
    "Imperfect",
    "Preterite",
    "Conditional",
    "Present Perfect",
    "Future Perfect",
    "Past Perfect",
    "Conditional Perfect",
    "Present Subjunctive",
    "Imperfect Subjunctive",
    "Future Subjunctive",
    "Present Perfect Subjunctive",
    "Future Perfect Subjunctive",
    "Past Perfect Subjunctive",
    "Affirmative Imperative",
    "Negative Imperative",
];

Conjugate.personAndNumber = [
    "yo",
    "tú",
    "él/ella/Ud.",
    "nosotros",
    "vosotros",
    "ellos/ellas/Uds." ,
];
