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
const EMPTY = -1, PAWN = 0, KNIGHT = 1, BISHOP = 2, ROOK = 3, QUEEN = 4, KING = 5;
const TRIPLET = -3, DUPLE = -2, QUARTER = 1;
const RHYTHMS = [TRIPLET,DUPLE,QUARTER,2,3,4,6,8,12,16,24,36];
const MOVE="Move", PAWN_PATCH="Pawn", CAPTURE="Capture", HARMONY = "Harmony", RHYTHM = "Rhythm";
const INSTRUMENTS = [MOVE,PAWN_PATCH,CAPTURE,HARMONY,RHYTHM];
const DEFAULT_INSTRUMENTS = [70,38,44,45,63]; //12];
const DEFAULT_PERCUSSION = [1192,1200,1209,1217,1228,1241,1252,1262];
const orchestra = [];
const drum_set = [];
const game = new Chess();
const board = Chessboard('mainBoard', 'start')
const MODE_CLOSE = "close", MODE_OFF = "off", MODE_PGN = "pgn", MODE_LICHESS_FOLLOW = "follow", MODE_LICHESS_TV = "tv";
let play_mode = MODE_OFF;
let moves, move_num;
let tempo;
let volume = .075;
let alberti = true;
let pgn_loop = false;
let rhythm_flag = 0;
let current_key = 60;
let current_eval = 0;
let current_FEN = "";
let fen_loop = false;
let last_pawn_push = 0;
let last_loop_ply = 0;
let pattern_length = 4;
let pawn_chord = [];
let pawn_chord_range = 32;
let fen_melody = { pitch: 60, wave: null };
let chk_mute_fen = document.getElementById("chk_mute_fen");
let chk_mute_lichess = document.getElementById("chk_mute_lichess");
let chk_mute_pgn = document.getElementById("chk_mute_pgn");
let chk_pawn_chord = document.getElementById("chk_pawn_chord");
let chk_pawn_perc = document.getElementById("chk_pawn_perc");
let chk_pawn_bass = document.getElementById("chk_pawn_bass");
let pgn_timer = null;

const AudioContextFunc = window.AudioContext || window.webkitAudioContext;
let audioContext = new AudioContextFunc();
const player = new WebAudioFontPlayer();

//<script src='https://surikov.github.io/webaudiofontdata/sound/0320_Chaos_sf2_file.js'></script>
//<script src='https://surikov.github.io/webaudiofontdata/sound/12842_6_JCLive_sf2_file.js'></script>
//<script src='https://surikov.github.io/webaudiofontdata/sound/12835_0_SBLive_sf2.js'></script>
//<script src='https://surikov.github.io/webaudiofontdata/sound/12838_0_SBLive_sf2.js'></script>
//<script src='https://surikov.github.io/webaudiofontdata/sound/12842_0_SBLive_sf2.js'></script>
//player.loader.decodeAfterLoading(audioContext, '_drum_42_6_JCLive_sf2_file');
//player.loader.decodeAfterLoading(audioContext, '_tone_0320_Chaos_sf2_file');


window.onload = function() {
    for (let i = 0; i<INSTRUMENTS.length; i++) {
        createInstrumentSelection(i,DEFAULT_INSTRUMENTS[i]);
        loadInstrument(INSTRUMENTS[i]);
    }
    loadDrumSet();
    setTempo();
    setVolume();
}

function randomizeOrchestra(def) {
    for (let i = 0; i<INSTRUMENTS.length; i++) {
        let e = document.getElementById("select_" + INSTRUMENTS[i]);
        e.selectedIndex = (def ? DEFAULT_INSTRUMENTS[i] : Math.floor(Math.random() * 128));
        loadInstrument(INSTRUMENTS[i]);
    }
}

function mapPitch(x, y) {
    return x + (y * 8) + 24;
}

function getPieceColor(piece) {
    return piece > PIECE_CODE.indexOf("k") ? "w" : "b";
}

function countdown(key_target,notes) {
    let t = (tempo/1000); let d = t * notes;
    let p = key_target - time_remaining;
    for (let i=0;i<notes;i++) {
        playNote(orchestra[MOVE],audioContext.currentTime + (t * i),p,t,volume);
        p+=3;
    }
}

function clearNotes() {
    player.cancelQueue(audioContext);
    playNewPawnChord([]);
}

function getKey() {
    return play_mode === MODE_LICHESS_FOLLOW || play_mode === MODE_LICHESS_TV ?
        (time_factor > 1 ?
            48 - Math.round(12 * (1/time_factor)) :
            24 + Math.round(24 * time_factor)
        ) : 48;
}

function setCurrentFEN(fen) {
    current_FEN = fen;
    document.getElementById("input_fen").value = current_FEN;
    board.position(current_FEN);
}

function playFEN(fen, move) {
    current_game.load(fen); console.log("Move: " + move);
    let from = move.substring(0,2), to = move.substring(2,4); let p = current_game.get(to);
    let mat = getMoveMatrix({ from: from, to: to } );
    let y = mat[1]-mat[3];
    let dir = y > 0 ? -1 : y == 0 ? 0 : 1;
    let dist = calcDist(mat); //console.log(dist);
    //let interval = dist * Math.ceil(current_game.turn() == "w" ? -1 : 1);
    //let interval = Math.round(dist * (current_game.turn() == "w" ? -2 : 2));
    let i = p !== null ? PIECE_CODE.indexOf(p.type) : 0; //console.log(i);
    let interval = 0;
    if (dir == 0) interval = Math.floor(i + dist) * (current_game.turn() == "w" ? -1 : 1);
    else interval = Math.floor(i + dist) * dir;
    console.log("Interval: " + interval);
    fen_melody.pitch += interval;
    if (fen_melody.wave !== null) fen_melody.wave.cancel();
    fen_melody.wave = playNote(orchestra[MOVE],audioContext.currentTime,fen_melody.pitch,8,volume);
    //console.log("Pitch: " + fen_melody.pitch);
}

function toggleFEN() {
    setFENPlayback(!fen_loop);
}

function setFENPlayback(bool) {
    fen_loop = bool;
    let e = document.getElementById("fen_butt");
    if (fen_loop) {
        e.innerText = "Stop FEN";
        loopFEN();
    }
    else {
        e.innerText = "FEN Loop";
    }
}

function loopFEN() {
    if (fen_loop) {
        if (!pgn_loop && (play_mode === MODE_LICHESS_FOLLOW || play_mode === MODE_LICHESS_TV)) playCurrentFEN();
        setTimeout(loopFEN,tempo * pattern_length);
    }
    else {
        clearNotes();
    }
}

function playCurrentFEN() {
    if ((play_mode === MODE_LICHESS_FOLLOW || play_mode === MODE_LICHESS_TV) && time_remaining < 10) {
        countdown(72,4);
    }
    let fen_str = current_FEN.split(" ")[0].split("/");
    let mode = last_pawn_push; //console.log(last_pawn_push);
    let notes = []; let pawns = []; let drum_map = []; let pawn_bass = [];
    for (let i=0; i<fen_str.length; i++) { notes[i] = []; pawn_bass[i] = []; }
    for (let rank = 0; rank < fen_str.length; rank++) {
        let file = 0;
        for (let i = 0; i < fen_str[rank].length; i++) {
            let piece_char = fen_str[rank].charAt(i);
            let piece = PIECE_CODE.indexOf(piece_char);
            let piece_type = PIECE_CODE.indexOf(piece_char.toLowerCase());
            let piece_color = getPieceColor(piece);
            if (piece_type === EMPTY) {
                let empty_squares = parseInt(fen_str[rank].charAt(i));
                file += empty_squares;
            }
            else {
                let adj_rank = piece_color === "w" ? 7-rank : rank; //descriptive style ranks
                if (piece_type === PAWN) { //console.log("Pawn rank: " + adj_rank);
                    if (adj_rank > 1) pawns.push({ pitch : MODES[mode][file] + 12 });
                    pawns.push({ pitch : MODES[mode][adj_rank-1] });
                    pawn_bass[file].push({note: (adj_rank-1) + (piece_color === "w" ? 6 : 0)});
                    drum_map.push({ color : piece_color, drum : rank, beat : file });
                }
                else {
                    let p = (piece_type === KING) ? 7 : piece_color === "w" ? piece_type - 1 : (piece_type - 1) + 4;
                    notes[file].push({octave: piece_type, note:MODES[mode][adj_rank]}); // piece:MODES[mode][p],
                }
                file++;
            }
        }
    } //console.log(notes + ", " + pawn_bass);

    if (chk_pawn_perc.checked) playPawnDrumMap(drum_map);
    if (chk_pawn_chord.checked) playNewPawnChord(pawns,60);
    if (chk_pawn_bass.checked) playPawnBassline(pawn_bass);
    if (!chk_mute_fen.checked) {
        let t = (tempo/1000) * (pattern_length/notes.length);
        for (let i = 0; i < notes.length; i++) {
            for (let n = 0; n < notes[i].length; n++) {
                let key = getKey(); let p = notes[i][n].note + ((notes[i][n].octave-1) * 12) + key;
                //console.log("Key: " + key + ", pitch: " + p);
                playNote(orchestra[RHYTHM],audioContext.currentTime + (t * i),p,t,volume);
            }
        }
    }

}



function playNewPawnChord(pawns, bass) {  //console.log(notes);
    for (let i = 0; i < pawn_chord_range; i++)  {
        let sounding = false;
        for (let n = 0; n < pawns.length; n++) {
            if (pawns[n].pitch === i) {
                sounding = true;
                if (pawn_chord[i] == null) { //console.log("New Note: " + i);
                    pawn_chord[i] = playNote(orchestra[PAWN_PATCH], 0, pawns[n].pitch + bass, 999, volume);
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

function playPawnDrumMap(map) {
    let t = (tempo/1000) * (pattern_length/map.length);
    for (let i=0;i<map.length;i++) { //console.log(map[i]);
        playNote(drum_set[map[i].drum], audioContext.currentTime + (t * map[i].beat), 60, 1, volume);
    }
}

function playPawnBassline(pawn_bass) {
    let t = (tempo/1000) * (pattern_length/pawn_bass.length);
    for (let beat = 0; beat < pawn_bass.length; beat++) {
        //console.log("Playing pawn bassline for beat #" + beat + ": " + pawn_bass[beat]);
        for (let n = 0; n < pawn_bass[beat].length; n++) { //console.log("Pawn Bass: " + i + ": "+pawn_bass[i][n].note);
            let p = pawn_bass[beat][n].note + getKey();
            playNote(orchestra[PAWN_PATCH],audioContext.currentTime + (t * beat),p,t, volume);
        }
    }
}

function mode_change() {
    console.log("Current Mode: " + play_mode);
    current_gid = null;
    switch (play_mode) {
        case MODE_PGN: clearTimeout(pgn_timer); break;
        case MODE_LICHESS_FOLLOW: clearTimeout(follow_timer); break;
        case MODE_LICHESS_TV:clearTimeout(tv_timer); break;
    }
    clearNotes();
    play_mode = document.getElementById("select_mode").value;
    console.log("New Mode: " + play_mode);
    switch (play_mode) {
        case MODE_PGN: startPGNPlayback(); break;
        case MODE_LICHESS_FOLLOW: followUser(); break;
        case MODE_LICHESS_TV: startTV(); break;
    }
}

function startPGNPlayback() {
    clearNotes();
    game.load_pgn(document.getElementById("pgnBox").value);
    moves = game.history({ verbose: true }); //console.log(moves);
    game.reset();
    move_num = 0; current_eval = 0; last_loop_ply = 0;
    loopPGN();
}

function loopPGN() {
    game.move(moves[move_num]);
    setCurrentFEN(game.fen());
    if (fen_loop && (last_loop_ply === 0 || ((move_num-last_loop_ply) >= pattern_length))) {
        playCurrentFEN();
        last_loop_ply = move_num;
    }
    playMove();
    if (play_mode == MODE_PGN && ++move_num < moves.length) pgn_timer = setTimeout(loopPGN,tempo);
}

function playMove() { //console.log("Playing: " + moves[move_num].from + moves[move_num].to);
    let mute = chk_mute_pgn.checked;
    let pitches = getMoveMatrix(moves[move_num]);
    if (moves[move_num].color === "b") {
        for (let i=0;i<pitches.length;i++) pitches[i] = 7-pitches[i]; //if (i % 2 == 1)
    }
    let dist = calcDist(pitches); //console.log("Distance:  " + dist);
    let t = tempo/1000;
    if (alberti) playAlbertiBass(CHORDS[PIECE_CODE.indexOf(moves[move_num].piece)]);

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
        let pitches = getMoveMatrix(move_history[i]);
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
    if (!mute && (play_mode !== MODE_OFF || fen_loop))
        return player.queueWaveTable(audioContext, audioContext.destination, i,t,p,d,v);
    else return null;
}

function getMoveMatrix(move) {
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

function loadDrumSet() {
    for (let i=0;i<8;i++) {
        let info = player.loader.instrumentInfo(DEFAULT_PERCUSSION[i]);
        player.loader.startLoad(audioContext, info.url, info.variable);
        player.loader.waitLoad(function () { drum_set[i++] = window[info.variable]; });
    }
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