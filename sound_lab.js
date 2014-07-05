var MIN_FREQ = 20;
var MAX_FREQ = 20000;

jQuery(function() {
    $("#file_selector").hide();

    var canvasEle = $("#scope");
    var oscillatorOptsEle = $("#oscillator_options");
    var playerButtonWrapperEle = $("#player_button_wrapper");
    var playButtonEle = $("#play_button");
    var rewindButtonEle = $("#rewind_button");
    var micButtonWrapperEle = $("#mic_button_wrapper");
    var micPlayButtonEle = $("#mic_play_button");
    var audioContext = CreateAudioContext();
    var masterGain;
    var analyser;
    var audioSource;
    var oscillator;
    var micSource;
    var playing = false;
    var micActive = false;
    var input;
    var visualizer;
    var scopeWidth = $("#scope_wrapper").width();
    var scopeHeight = 500;

    var initOscillator = function(oscillatorType) {
	if(audioContext) {
	    playing = false;
	    playButtonEle.removeClass("active");
	    $("#play_button_icon").addClass("glyphicon-play");
	    $("#play_button_icon").removeClass("glyphicon-stop");
	    $("#play_button_text").text("PLAY");
	    oscillatorOptsEle.show();
	    if(audioSource) {
		audioSource.disconnect(0);
		audioSource = null;
	    }
	    oscillator = audioContext.createOscillator();
	    if(oscillator) {
		oscillator.frequency.value = $("#oscillator_freq").val();
		oscillator.type = oscillatorType;
		oscillator.detune.value = 0;
		oscillator.connect(masterGain);
		audioSource = oscillator;
		rewindButtonEle.hide();
		playerButtonWrapperEle.show();
		micButtonWrapperEle.hide();
	    }
	}
    };

    var initMicrophone = function() {
	if(audioContext && !micActive) {
	    if(audioSource) {
		audioSource.disconnect(0);
		audioSource = null;
	    }

	    navigator.webkitGetUserMedia({audio: true}, onMicStream, onMicStreamError);
	}
    };

    var onMicStream = function(stream) {
	micSource = audioContext.createMediaStreamSource(stream);
	if(micSource) {
	    audioSource = micSource;
	    micSource.connect(masterGain);
	    playerButtonWrapperEle.hide();
	    micButtonWrapperEle.show();
	    oscillatorOptsEle.hide();
	}
    };

    var onMicStreamError = function(error) {
	console.log(error);
	alert("お使いのブラウザでは，Web Audio APIのマイク入力がサポートされていません。");
    };

    var startVisualizer = function() {
	visualizer.start();
    };

    var stopVisualizer = function() {
	visualizer.stop();
    };

    oscillatorOptsEle.hide();
    playerButtonWrapperEle.hide();
    micButtonWrapperEle.hide();
    canvasEle.attr("width", scopeWidth);
    canvasEle.attr("height", scopeHeight);

    if(!audioContext) {
	alert("お使いのブラウザでは，Web Audio APIがサポートされていません。");
	return;
    }
    analyser = audioContext.createAnalyser();
    if(analyser) {
	analyser.connect(audioContext.destination);
	masterGain = audioContext.createGain();
	if(masterGain) {
	    masterGain.connect(analyser);
	}
	var canvasContext = getCanvas2DContext(canvasEle);
	visualizer = new Visualizer(analyser, canvasContext);
    }

    $("#input").change(function(e) {
	input = $(this).val();
	switch(input) {
	case "sine": // sine wave oscillator
	    initOscillator(input);
	    break;
	case "square": // square wave oscillator
	    initOscillator(input);
	    break;
	case "sawtooth": // sawtooth wave oscillator
	    initOscillator(input);
	    break;
	case "triangle": // triangle wave oscillator
	    initOscillator(input);
	    break;
	case "mic": // microphone
	    initMicrophone();
	    break;
	}
    });

    $("#oscillator_freq").change(function(e) {
	var newFreq = $(this).val();
	if(oscillator && newFreq >= MIN_FREQ && newFreq <= MAX_FREQ) {
	    oscillator.frequency.value = newFreq;
	}
    });

    playButtonEle.click(function(e) {
	if(audioSource) {
	    playing = !playing;
	    if(!playing) {
		audioSource.stop(0);
		stopVisualizer();
		initOscillator(oscillator.type);
		$(this).removeClass("active");
		$("#play_button_icon").addClass("glyphicon-play");
		$("#play_button_icon").removeClass("glyphicon-stop");
		$("#play_button_text").text("PLAY");
	    }
	    else {
		audioSource.start(0);
		startVisualizer();
		$(this).addClass("active");
		$("#play_button_icon").removeClass("glyphicon-play");
		$("#play_button_icon").addClass("glyphicon-stop");
		$("#play_button_text").text("STOP");
	    }
	}
    });

    micPlayButtonEle.click(function(e) {
	micActive = !micActive;
	if(!micActive) {
	    stopVisualizer();
	    console.log("mic: off");
	    $(this).removeClass("active");
	    $("#mic_button_icon").addClass("glyphicon-record");
	    $("#mic_button_icon").removeClass("glyphicon-stop");
	    $("#mic_button_text").text("RECORD");
	}
	else {
	    startVisualizer();
	    console.log("mic: on");
	    $(this).addClass("active");
	    $("#mic_button_icon").removeClass("glyphicon-record");
	    $("#mic_button_icon").addClass("glyphicon-stop");
	    $("#mic_button_text").text("STOP");
	}
    });
});

var SMOOTHING = 0.8;
var FFT_SIZE = 2048;
var FREQ_GRIDS = [1000, 5000, 10000, 20000];
var GRID_TEXT_COLOR = "#3f3f3f";
var GRID_COLOR = "#a0a0a0";
var GRID_FONT = "12px monospace"
var STATS_BACK_COLOR = "black";
var STATS_TEXT_COLOR = "white";
var STATS_FONT = "14px monospace";
var STATS_TEXT_YPOS = 18;

function Visualizer(analyser, canvasContext) {
    window.requestAnimFrame = (function(){
	return  window.requestAnimationFrame       || 
	    window.webkitRequestAnimationFrame || 
	    window.mozRequestAnimationFrame    || 
	    window.oRequestAnimationFrame      || 
	    window.msRequestAnimationFrame     || 
	    function( callback ){
		window.setTimeout(callback, 1000 / 60);
	    };
    })();

    this.analyser = analyser;
    this.freqs = new Uint8Array(this.analyser.frequencyBinCount);
    this.times = new Uint8Array(this.analyser.frequencyBinCount);
    this.analysing = false;
    this.canvasContext = canvasContext;
}

Visualizer.prototype.start = function() {
    this.analysing = true;
    requestAnimFrame(this.draw.bind(this));
}

Visualizer.prototype.stop = function() {
    this.analysing = false;
}

Visualizer.prototype.draw = function() {
    var statsHeight = 20;
    var canvasWidth = this.canvasContext.canvas.width;
    var canvasHeight = this.canvasContext.canvas.height;
    var scopeHeight = canvasHeight - statsHeight;
    var fftPeakValue = 0;
    var fftPeakFreq = 0;

    this.canvasContext.canvas.width = canvasWidth;
    this.canvasContext.canvas.height = canvasHeight;

    this.analyser.smoothingTimeConstant = SMOOTHING;
    this.analyser.fftSize = FFT_SIZE;

    this.analyser.getByteFrequencyData(this.freqs);
    this.analyser.getByteTimeDomainData(this.times);

    for(var i=0; i<this.analyser.frequencyBinCount; ++i) {
	var value = this.freqs[i];
	var percent = value / 256;
	var height = scopeHeight * percent;
	var offset = scopeHeight - height - 1 + statsHeight;
	var barWidth = canvasWidth / this.analyser.frequencyBinCount;
	var hue = i / this.analyser.frequencyBinCount * 360;
	this.canvasContext.fillStyle = 'hsl(' + hue + ', 100%, 50%)';
	this.canvasContext.fillRect(i * barWidth, offset, barWidth, height);
	if(value > fftPeakValue) {
	    fftPeakFreq = this.getFreq(i);
	    fftPeakValue = value;
	}
    }

    for(var i=0; i<this.analyser.frequencyBinCount; ++i) {
	var value = this.times[i];
	var percent = value / 256;
	var height = scopeHeight * percent;
	var offset = scopeHeight - height - 1 + statsHeight;
	var barWidth = canvasWidth / this.analyser.frequencyBinCount;
	this.canvasContext.fillStyle = "black";
	this.canvasContext.fillRect(i * barWidth, offset, 1, 2);
    }

    // STATS
    this.canvasContext.fillStyle = STATS_BACK_COLOR;
    this.canvasContext.fillRect(0, 0, canvasWidth, statsHeight);
    this.canvasContext.font = STATS_FONT;
    this.canvasContext.fillStyle = STATS_TEXT_COLOR;
    this.canvasContext.fillText("peak : " + Math.floor(fftPeakFreq) + "Hz",
				10, STATS_TEXT_YPOS);

    // GRID
    this.canvasContext.strokeStyle = GRID_COLOR;
    this.canvasContext.lineWidth = 1;
    this.canvasContext.beginPath();
    this.canvasContext.moveTo(0, statsHeight + scopeHeight/2);
    this.canvasContext.lineTo(canvasWidth, statsHeight + scopeHeight/2);
    for(var freqIndex=0; freqIndex<FREQ_GRIDS.length; ++freqIndex) {
	var freq = FREQ_GRIDS[freqIndex];
	var x = this.getIndex(freq)*barWidth;
	this.canvasContext.moveTo(x, statsHeight);
	this.canvasContext.lineTo(x, scopeHeight + statsHeight);
	this.canvasContext.font = GRID_FONT;
	this.canvasContext.fillStyle = GRID_TEXT_COLOR;
	this.canvasContext.fillText(freq+"Hz", x+2, canvasHeight - 5);
    }
    this.canvasContext.stroke();

    if(this.analysing) {
	requestAnimFrame(this.draw.bind(this));
    }
}

Visualizer.prototype.getIndex = function(freq) {
    var nyquist = this.analyser.context.sampleRate/2;
    return Math.round(freq / nyquist * this.analyser.frequencyBinCount);
}

Visualizer.prototype.getFreq = function(index) {
    var nyquist = this.analyser.context.sampleRate/2;
    return (index * nyquist / this.analyser.frequencyBinCount);
}
