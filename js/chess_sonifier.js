//TODO: make lichess/pgn playback a dropdown select/choice

const IONIAN = [ 0,2,4,5,7,9,11,12 ];
const DORIAN = [ 0,2,3,5,7,9,10,12 ];
const PHRYGIAN = [ 0,1,3,5,7,8,10,12 ];
const LYDIAN = [ 0,2,4,6,7,9,11,12 ];
const MIXOLYDIAN = [ 0,2,4,5,7,9,10,12 ];
const AEOLIAN = [ 0,2,3,5,7,8,10,12 ];
const LOCRIAN = [ 0,1,3,5,6,8,10,12 ];
const BLUES = [ 0,2,3,4,7,9,11,12 ];
const CHROMATIC = [0,1,2,3,4,5,6,7,8,9,10,11,12];
const MODES = [IONIAN,DORIAN,PHRYGIAN,LYDIAN,MIXOLYDIAN,AEOLIAN,LOCRIAN,BLUES,CHROMATIC]; //let mode = IONIAN; //unused
const TONIC = [0,4,7], SUBMEDIANT = [0,4,9], SUBDOMINANT = [0,5,9], DIM = [0,3,6], AUG = [0,4,8], MINOR = [0,3,7];
const CHORDS = [TONIC,SUBMEDIANT,SUBDOMINANT,DIM,AUG,MINOR];
const PIECE_CODE = "pnbrqkPNBRQK";
const PAWN = 0, KNIGHT = 1, BISHOP = 2, ROOK = 3, QUEEN = 4, KING = 5;
const TRIPLET = -3, DUPLE = -2, QUARTER = 1;
const RHYTHMS = [TRIPLET,DUPLE,QUARTER,2,3,4,6,8,12,16,24,36];
const MOVE="Move", PAWN_STR="Pawn", CAPTURE="Capture", HARMONY = "Harmony", RHYTHM = "Rhythm";
const INSTRUMENTS = [MOVE,PAWN_STR,CAPTURE,HARMONY, RHYTHM];
const DEFAULT_INSTRUMENTS = [70,46,44,45,12];
const orchestra = [];
const game = new Chess();
const board = Chessboard('mainBoard', 'start')
let moves, move_num;
let tempo;
let volume = .075;
let alberti = true;
let playing = false;
let rhythm_flag = 0;
let current_key = 60;
let current_eval = 0;
let fen_loop = false;
let last_pawn_push = 0;
let last_loop_ply = 0;
let pattern_length = 4;
let pawn_chord = [];
let pawn_chord_range = 32;

const AudioContextFunc = window.AudioContext || window.webkitAudioContext;
let audioContext = new AudioContextFunc();
const player = new WebAudioFontPlayer();
player.loader.decodeAfterLoading(audioContext, '_drum_42_6_JCLive_sf2_file');
player.loader.decodeAfterLoading(audioContext, '_tone_0320_Chaos_sf2_file');

window.onload = function() {
    for (let i = 0; i<INSTRUMENTS.length; i++) {
        createInstrumentSelection(i,DEFAULT_INSTRUMENTS[i]);
        loadInstrument(INSTRUMENTS[i]);
    }
    //setMode();
    setTempo();
    setVolume();
}

function updateFEN(fen) {
    document.getElementById("input_fen").value = fen;
    board.position(fen);
}

//TODO: percussion map for pawns?!
function newPawnChord(notes, bass) {  //console.log(notes);
    for (let i = 0; i < pawn_chord_range; i++)  {
        let sounding = false;
        for (let n = 0; n < notes.length; n++) {
            if (notes[n] === i) {
                sounding = true;
                if (pawn_chord[i] == null) { //console.log("New Note: " + i);
                    pawn_chord[i] = playNote(orchestra[PAWN_STR], 0, notes[n] + bass, 999, volume);
                }
                break;
            }
        }
        if (!sounding && pawn_chord[i]) { //console.log("Cancelling Note: " + i + ", " + pawn_chord[i]);
            pawn_chord[i].cancel(); //TODO: does this work?
            pawn_chord[i] = null;
        }
    }
}

function randomOrchestra(def) {
    for (let i = 0; i<INSTRUMENTS.length; i++) {
        let e = document.getElementById("select_" + INSTRUMENTS[i]);
        e.selectedIndex = (def ? DEFAULT_INSTRUMENTS[i] : Math.floor(Math.random() * 128));
        loadInstrument(INSTRUMENTS[i]);
    }
}

function mapPitch(x, y) {
    return x + (y * 8) + 24;
}

function pieceColor(piece) {
    return piece > PIECE_CODE.indexOf("k") ? "w" : "b";
}

function runFEN() {
    let e = document.getElementById("fen_butt");
    let fen_box = document.getElementById("input_fen");
    if (!fen_loop) {
        fen_loop = true;
        e.innerText = "Stop FEN";
        playFEN(fen_box.value,true);
    }
    else {
        fen_loop = false;
        clearNotes();
        e.innerText = "Play FEN";
    }
}

function countdown(keytarget,notes) {
    let t = (tempo/1000) * notes;
    let p = keytarget - timeRemaining;
    for (let i=0;i<notes;i++) {
        playNote(orchestra[MOVE],audioContext.currentTime + (t * i),p,t,volume);
        p+=3;
    }
}

function playFEN(fen) {
    if (lichess && timeRemaining<10) countdown(72,4);
    let fen_str = fen.split(" ")[0].split("/");
    let mode = last_pawn_push; //console.log(last_pawn_push);
    let notes = []; let pawns = [];
    for (let i=0; i<fen_str.length; i++) notes[i] = [];
    for (let rank = 0; rank < fen_str.length; rank++) {
        let file = 0;
        for (let i = 0; i < fen_str[rank].length; i++) {
            let piece_char = fen_str[rank].charAt(i);
            let piece = PIECE_CODE.indexOf(piece_char);
            let piece_type = PIECE_CODE.indexOf(piece_char.toLowerCase());
            let piece_color = pieceColor(piece);
            if (piece_type === -1) {  //for (let i=0;i<empty_squares;i++) notes[file + i].push(-1);
                let empty_squares = parseInt(fen_str[rank].charAt(i));
                file += empty_squares;
            }
            else {
                let adj_rank = piece_color === "w" ? 7-rank : rank; //descriptive style ranks
                if (piece_type === PAWN) {
                    if (adj_rank > 1) pawns.push(MODES[mode][file] + 12);
                    if (adj_rank > 0) pawns.push(MODES[mode][adj_rank-1]);
                }
                else { //notes[file].push(piece + MODES[piece_type][adj_rank] + 48);
                    let p = (piece_type === KING) ? 7 : piece_color === "w" ? piece_type - 1 : (piece_type - 1) + 4;
                    notes[file].push({piece_type: piece_type,piece:MODES[mode][p],rank:MODES[mode][adj_rank]});
                }
                file++;
            }
        }
    }
    //console.log(notes);
    newPawnChord(pawns,60);
    let t = (tempo/1000) * (pattern_length/notes.length);
    for (let i = 0; i < notes.length; i++) {
        for (let n = 0; n < notes[i].length; n++) {
            let p = notes[i][n].rank + (((notes[i][n].piece_type-1) * 12) +
            lichess ? timeFactor > 1 ? 80 - Math.round(8 * 1/timeFactor) : 36 + Math.round(36 * timeFactor) : 48);
            if (document.getElementById("chk_funk").checked) {
                let t2 = t/notes[i].length;
                playNote(orchestra[RHYTHM],audioContext.currentTime + (t * i) + (t2 * n),p,t,volume);
            }
            else playNote(orchestra[RHYTHM],audioContext.currentTime + (t * i),p,t,volume);
        }
    }
    if (fen_loop) {
        setTimeout(() => playFEN(document.getElementById("input_fen").value,true),
        tempo * pattern_length);
    }
}

function clearNotes() {
    player.cancelQueue(audioContext);
    newPawnChord([]);
}

function playGame() {
    if (!playing) {
        game.load_pgn(document.getElementById("pgnBox").value);
        moves = game.history({ verbose: true }); //console.log(moves);
        game.reset();
        move_num = 0; current_eval = 0; last_loop_ply = 0;
        setPlaying(true);
        nextMove();
    }
    else {
        setPlaying(false);
    }
}

function setPlaying(bool) {
    clearNotes();
    playing = bool; let butt = document.getElementById("start_butt");
    if (playing) { butt.innerText = " Stop "; butt.value = "stop"; }
    else { butt.innerText = " Start "; butt.value = "start"; }
}

function nextMove() {
    game.move(moves[move_num]);
    updateFEN(game.fen()); //board.position(game.fen());
    if (document.getElementById("chk_extra").checked &&
        (last_loop_ply === 0 || ((move_num-last_loop_ply) >= pattern_length))) {
        playFEN(game.fen()); //,false, moves[move_num].piece === "p");
        last_loop_ply = move_num;
    }
    playMove();
    if (playing && ++move_num < moves.length) window.setTimeout(nextMove,tempo);
    else setPlaying(false);
}

function playMove() { //console.log("Playing: " + moves[move_num].from + moves[move_num].to);
    let mute = document.getElementById("chk_mute").checked;
    let pitches = getPitches(moves[move_num]);
    if (moves[move_num].color === "b") {
        for (let i=0;i<pitches.length;i++) pitches[i] = 7-pitches[i]; //if (i % 2 == 1)
    }
    let dist = calcDist(pitches); //console.log("Distance:  " + dist);
    let t = tempo/1000;
    if (alberti && !mute) playAlbertiBass(CHORDS[PIECE_CODE.indexOf(moves[move_num].piece)]);

    if (moves[move_num].captured) {
        current_key = 60 + PIECE_CODE.indexOf(moves[move_num].piece);
        playNote(orchestra[CAPTURE],0,current_key - 24, t * ((nextCapture() - move_num)+1), volume, mute);
    }
    else current_eval = getEval(game.fen());

    rhythm_flag--;
    let current_mode = MODES[PIECE_CODE.indexOf(moves[move_num].piece)];
    if (moves[move_num].piece === "p") { //console.log("Pawn move!"); //TODO: use pitches[3] somehow
        playNote(orchestra[MOVE],0,current_mode[pitches[2]] + current_key, tempo/1000, volume, mute);
        last_pawn_push = pitches[2];
    }
    else if (rhythm_flag <= 0) {
        let r = Math.round(dist)-1; //console.log(dist + ", " + r);
        if (RHYTHMS[r] < QUARTER) {
            let d = (tempo/1000)/Math.abs(RHYTHMS[r]);
            playNote(orchestra[MOVE],0,
                current_mode[pitches[2]] + current_key, d, volume, mute);
            playNote(orchestra[MOVE],audioContext.currentTime + d,
                current_mode[pitches[3]] + current_key,d,volume, mute);
            if (RHYTHMS[r] === TRIPLET) {
                let triplet_pitch = (pitches[0] + pitches[1]); if (triplet_pitch > 12) triplet_pitch = 12;
                playNote(orchestra[MOVE],audioContext.currentTime + (d*2),
                    triplet_pitch + current_key, d, volume, mute);
            }
        }
        else {
            rhythm_flag = RHYTHMS[r]; //console.log("Rhythm: " + rhythm_flag);
            playNote(orchestra[MOVE],0,current_mode[pitches[2]] + current_key, t * rhythm_flag, volume, mute);
            playNote(orchestra[MOVE],0,current_mode[pitches[3]] + current_key, t * rhythm_flag, volume, mute);
        }
    }
}

function playAlbertiBass(chord) {

    let beats = 1 + Math.abs(current_eval); if (beats > 4) beats = 4; //console.log(current_eval);
    let d = (tempo/1000)/beats;

    if (current_eval === 0) {
        for (let i=1;i<chord.length;i++) {
            playNote(orchestra[HARMONY],0,chord[i] + current_key,tempo/1000, volume/2);
        }
    }
    else if (current_eval < 0) { //arpeggios
        for (let beat=0;beat<beats;beat++) {
            let i = beat % chord.length;
            playNote(orchestra[HARMONY],audioContext.currentTime + (d*beat),chord[i] + current_key,d, volume/2);
        }
    }
    else { //waltz/boom-chuck
        playNote(orchestra[HARMONY],0,chord[0] + current_key,d,volume/2);
        for (let beat=1;beat<beats;beat++)
        for (let i=1;i<chord.length;i++) {
           playNote(orchestra[HARMONY],audioContext.currentTime + (d*beat),chord[i] + current_key,d, volume/2);
        }
    }
}

function calcDist(v) {
    return Math.sqrt(Math.pow(Math.abs(v[0]-v[2]),2) + Math.pow(Math.abs(v[1]-v[3]),2));
}

function getRhythm(v) {
    console.log("Rhythm: " + v);
    switch(v) {
        case 1: return .25;
        case 2: return .5;
        case 3: return 1;
        case 4: return 1.25;
        case 5: return 1.5;
        case 6: return 2;
        default: return 1;
    }
}

function getMelody(move_history) {
    let current_pitch = 60;
    let mode = DORIAN;
    let melody = []; melody.push({ pitch: current_pitch, dur: 1 });
    let dir = 1;
    for (let i=0;i<move_history.length;i++) { //console.log(move_history[i]);
        let piece = PIECE_CODE.indexOf(move_history[i].piece.toLowerCase());
        let pitches = getPitches(move_history[i]);
        let x_dir = pitches[2] - pitches[0], y_dir = pitches[3] - pitches[1];
        let new_dir = dir; if (y_dir > 0) new_dir = 1; else if (y_dir < 0) new_dir = -1;
        if (move_history[i].captured) { mode = MODES[pitches[2]]; }
        else if (piece === PAWN) { mode = MODES[pitches[3]]; }
        else dir = new_dir;
        let interval = mode[piece]; //+ x_dir; if (interval < 0) interval = 0;
        current_pitch += (interval * dir);
        if (current_pitch > 96 || current_pitch < 24) current_pitch = 60;
        melody.push({ pitch: current_pitch, dur: Math.round(calcDist(pitches)) });
    }
    return melody;
}

function playMelody(melody, play_time, num_notes) {
    let t = 0, n = (num_notes ? num_notes : melody.length);
    for (let i = melody.length - n; i < melody.length; i++) if (i >= 0) t += melody[i].dur;
    let speed = t / play_time; t = 0;
    for (let i = melody.length - n; i < melody.length; i++) if (i >= 0) {
        let d = melody[i].dur / speed;
        playNote(orchestra[MOVE],audioContext.currentTime + t,melody[i].pitch,d,volume);
        t += d;
    }
    for (let i=0;i<t;i += (t/4)) playNote(orchestra[RHYTHM],audioContext.currentTime + i,48,t,volume);
    return t; //should be play_time;
}

function playChord(chord, play_time) {
    for (let i = 0; i < chord.length; i++) playNote(orchestra[HARMONY],0,chord[i].pitch,play_time,volume);
}

function getEval(fen) {
    let piece_str = fen.split(" ")[0];
    let e = 0;
    for (let i = 0; i < piece_str.length; i++) {
        let v = 0;
        switch(piece_str.charAt(i)) {
            case "p": v = -1; break;
            case "n": v = -3; break;
            case "b": v = -3; break;
            case "r": v = -5; break;
            case "q": v = -9; break;
            case "P": v = 1; break;
            case "N": v = 3; break;
            case "B": v = 3; break;
            case "R": v = 5; break;
            case "Q": v = 9; break;
        }
        e += v;
    }
    return e;
}

function pawnCount(fen) {
    let fen_str = fen.split(" ");
    let piece_str = fen_str[0];
    let pawn = fen_str[1] === "w" ? "P" : "p";
    let count = 0;
    for (let i = 0; i < piece_str.length; i++) if (piece_str.charAt(i) === pawn) count++;
    return count;
}

function playNote(i,t,p,d,v,mute) { //console.log(i + "," + t + "," + p + "," + d + "," + v +"," + mute);
    if (!mute && (lichess || playing || fen_loop))
        return player.queueWaveTable(audioContext, audioContext.destination, i,t,p,d,v);
    else return null;
}

function getPitches(move) {
    let f1 = move.from.charCodeAt(0) - 'a'.charCodeAt(0), f2 = move.from.charCodeAt(1) - '0'.charCodeAt(0) - 1;
    let t1 = move.to.charCodeAt(0) - 'a'.charCodeAt(0), t2 = move.to.charCodeAt(1) - '0'.charCodeAt(0) - 1;
    return [f1,f2,t1,t2];
}

function nextCapture() {
    for (let i= move_num+1; i<moves.length; i++) if (moves[i].captured) return i;
    return moves.length;
}

function nextPawnMove() {
    for (let i= move_num+1; i<moves.length; i++) if (moves[i].piece === "p") return i;
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
    label.textContent = "Timbre: " + INSTRUMENTS[idx];
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

function setTempo() {
    let e = document.getElementById("range_tempo");
    tempo = 60000/e.value; //console.log("New Tempo: " + tempo);
    document.getElementById("lab_tempo").innerText = "Tempo: " + e.value;
}

function setVolume() {
    let e = document.getElementById("range_volume");
    volume = e.value/1000; //console.log("New Volume: " + volume);
    document.getElementById("lab_volume").innerText = "Volume: " + e.value + "%";
}

//function setMode() {
    //mode = MODES[document.getElementById("select_mode").selectedIndex]; //console.log("New Mode: " + mode);
//}