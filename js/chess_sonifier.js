const IONIAN = [ 0,2,4,5,7,9,11,12 ];
const DORIAN = [ 0,2,3,5,7,9,10,12 ];
const PHRYGIAN = [ 0,1,3,5,7,8,10,12 ];
const LYDIAN = [ 0,2,4,6,7,9,11,12 ];
const MIXOLYDIAN = [ 0,2,4,5,7,9,10,12 ];
const AEOLIAN = [ 0,2,3,5,7,8,10,12 ];
const LOCRIAN = [ 0,1,3,5,6,8,10,12 ];
const BLUES = [ 0,2,3,4,7,9,11,12 ];
const CHROMATIC = [0,1,2,3,4,5,6,7,8,9,10,11,12];
const MODES = [IONIAN,DORIAN,PHRYGIAN,LYDIAN,MIXOLYDIAN,AEOLIAN,LOCRIAN,BLUES,CHROMATIC]; let mode = IONIAN;
const PAWN="p", KNIGHT="n", BISHOP="b", ROOK="r", QUEEN="q", KING="k", WHITE="w", BLACK="b", LEAD="lead";
const INSTRUMENTS = [PAWN,KNIGHT,BISHOP,ROOK,QUEEN,KING,WHITE,BLACK,LEAD];
const SELECT_NAMES = ["Pawn","Knight","Bishop","Rook","Queen","King","White","Black","Capture"];
const DEFAULT_INSTRUMENTS = [1,71,73,11,24,32,52,53,112];
const orchestra = [];
const game = new Chess();
const board = Chessboard('mainBoard', 'start')
let moves, move_num;
let tempo = 500;
let volume = .075;
let current_octave = 64;
let playing = false;

const AudioContextFunc = window.AudioContext || window.webkitAudioContext;
let audioContext = new AudioContextFunc();
const player = new WebAudioFontPlayer();
player.loader.decodeAfterLoading(audioContext, '_drum_42_6_JCLive_sf2_file');
player.loader.decodeAfterLoading(audioContext, '_tone_0320_Chaos_sf2_file');

window.onload = function() {
    for (let i = 0; i<INSTRUMENTS.length; i++) {
        createInstrumentSelection(i,1); //Math.floor(Math.random() * 128)); //DEFAULT_INSTRUMENTS[i]);
        loadInstrument(INSTRUMENTS[i]);
    }
    setMode();
    setTempo();
    setVolume();
}

function rndOrch(def) {
    for (let i = 0; i<INSTRUMENTS.length; i++) {
        let e = document.getElementById("select_" + INSTRUMENTS[i]);
        e.selectedIndex = (def ? 1 : Math.floor(Math.random() * 128));
        loadInstrument(INSTRUMENTS[i]);
    }
}

function playGame() {
    player.cancelQueue(audioContext);
    if (!playing) {
        game.load_pgn(document.getElementById("pgnBox").value);
        moves = game.history({ verbose: true }); //console.log(moves);
        game.reset();
        move_num = 0;
        setPlaying(true);
        nextMove();
    }
    else setPlaying(false);
}

function setPlaying(bool) {
    playing = bool; let butt = document.getElementById("start_butt");
    if (playing) { butt.innerText = " Stop "; butt.value = "stop"; }
    else { butt.innerText = " Start "; butt.value = "start"; }
}

function nextMove() {  //console.log("Playing: " + moves[move_num].from + moves[move_num].to);
    game.move(moves[move_num]);
    board.position(game.fen());
    let pitches = getPitches(moves[move_num]);
    let dist = calcDist(pitches[0],pitches[1],pitches[2],pitches[3]); //console.log("Distance:  " + dist);
    let adj_tempo = (tempo/2) * Math.floor(dist);
    let t = adj_tempo/1000;

    if (moves[move_num].captured) {
        let dur = t * ((nextCapture() - move_num)+1);
        let p = pitches[2] + pitches[3]; if (p > 12) p = 12;
        playNote(orchestra[LEAD],0,p + getOctave(moves[move_num].piece), dur, volume);
    }
    else if (mode === CHROMATIC) {
        let octave = getOctave(moves[move_num].piece);
        let p1 = pitches[0] + pitches[1]; if (p1 > 12) p1 = 12;
        let p2 = pitches[2] + pitches[3]; if (p2 > 12) p2 = 12;
        playNote(orchestra[moves[move_num].color],0,p2 + octave, t, volume);
        if (moves[move_num].piece !== "p") {
            playNote(orchestra[moves[move_num].color],
                audioContext.currentTime + t/2,p1 + octave, t/2, volume);
        }
    }
    else {
        if (moves[move_num].piece === "p") {
            current_octave = pitches[3] * 12; //console.log("Octave Change: " + current_octave);
            playNote(orchestra[moves[move_num].piece],0,current_octave + mode[pitches[3]],t,volume);
        }
        else {
            playNote(orchestra[moves[move_num].piece],0,current_octave + mode[pitches[2]],t,volume);
            playNote(orchestra[moves[move_num].piece],
                audioContext.currentTime + t/2,current_octave + mode[pitches[3]],t/2,volume);
        }
    }

    if (playing && ++move_num < moves.length) window.setTimeout(nextMove,adj_tempo) ;
    else setPlaying(false);
}

function calcDist(x1,y1,x2,y2) {
    return Math.sqrt(Math.pow(Math.abs(x1-x2),2) + Math.pow(Math.abs(y1-y2),2));
}

function playNote(i,t,p,d,v) {
    player.queueWaveTable(audioContext, audioContext.destination, i,t,p,d,v);
}

function getPitches(move) {
    let f1 = move.from.charCodeAt(0) - 'a'.charCodeAt(0), f2 = move.from.charCodeAt(1) - '0'.charCodeAt(0) - 1;
    let t1 = move.to.charCodeAt(0) - 'a'.charCodeAt(0), t2 = move.to.charCodeAt(1) - '0'.charCodeAt(0) - 1;
    return [f1,f2,t1,t2];
}

function getOctave(p) {
    switch(p) {
        case "p": return 48;
        case "n": return 60;
        case "b": return 72;
        case "r": return 36;
        case "q": return 84;
        case "k": return 24;
        default: return 0;
    }
}

function nextCapture() {
    for (let i= move_num+1; i<moves.length; i++) if (moves[i].captured) return i;
    return moves.length;
}

function createInstrumentSelection(idx,def) {
    let type = INSTRUMENTS[idx];
    let sel = document.createElement("select");
    sel.id = "select_" + type;
    let previousInst = "";
    for (let i = 0; i < player.loader.instrumentKeys().length; i++) {
        let opt = document.createElement('option');
        let title = player.loader.instrumentInfo(i).title;
        if (previousInst !== title) { //there often exist several duplicate instruments within each bank
            previousInst = title;
            opt.innerHTML = title;
            opt.value = i.toString();
            sel.appendChild(opt);
        }
    }
    sel.selectedIndex = def;
    sel.addEventListener("click", ()=> loadInstrument(type));
    let label = document.createElement("label");
    label.htmlFor = sel.id;
    label.textContent = "Timbre: " + SELECT_NAMES[idx];
    let div = document.getElementById("timbre_box");
    div.appendChild(label);
    div.appendChild(document.createElement("br"));
    div.appendChild(sel);
    div.appendChild(document.createElement("br"));
    div.appendChild(document.createElement("br"));
}

function loadInstrument(type) {
    let i = document.getElementById("select_" + type).value;
    let info = player.loader.instrumentInfo(i);
    player.loader.startLoad(audioContext, info.url, info.variable);
    player.loader.waitLoad(function () { orchestra[type] = window[info.variable]; });
}

function setMode() {
    mode = MODES[document.getElementById("select_mode").selectedIndex]; //console.log("New Mode: " + mode);
}

function setTempo() {
    let e = document.getElementById("range_tempo");
    tempo = 60000/e.value; //console.log("New Tempo: " + tempo);
    document.getElementById("lab_tempo").innerText = "Tempo: " + e.value;
}

function setVolume() {
    let e = document.getElementById("range_volume");
    volume = e.value/1000; console.log("New Volume: " + volume);
    document.getElementById("lab_volume").innerText = "Volume: " + e.value + "%";
}