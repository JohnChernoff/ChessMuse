const IONIAN = [ 0,2,4,5,7,9,11,12 ];
const DORIAN = [ 0,2,3,5,7,9,10,12 ];
const PHRYGIAN = [ 0,1,3,5,7,8,10,12 ];
const LYDIAN = [ 0,2,4,6,7,9,11,12 ];
const MIXOLYDIAN = [ 0,2,4,5,7,9,10,12 ];
const AEOLIAN = [ 0,2,3,5,7,8,10,12 ];
const LOCRIAN = [ 0,1,3,5,6,8,10,12 ];
const BLUES = [ 0,2,3,4,7,9,11,12 ];
const CHROMATIC = [0,1,2,3,4,5,6,7,8,9,10,11,12];
const MODES = [IONIAN,DORIAN,PHRYGIAN,LYDIAN,MIXOLYDIAN,AEOLIAN,LOCRIAN,BLUES,CHROMATIC]; let mode = IONIAN; //unused
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
let tempo = 500;
let volume = .075;
let alberti = true;
let playing = false;
let rhythm_flag = 0;
let current_key = 60;
let current_eval = 0;
let pawn_moves = 0;
let fen_loop = false;
let melody = 60, simple_melody = false;

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

function runFEN(e) {
    let fen_box = document.getElementById("fenBox");
    if (!fen_loop) {
        fen_loop = true; playFEN(fen_box.value,true); e.innerText = "Stop FEN";
    }
    else {
        player.cancelQueue(audioContext);
        e.innerText = "Play FEN"; fen_loop = false;
    }
}

function playPGNRhythm(piece_type,piece_color,file,rank,pawn_count,pawn_move,turn) {
    let eights = (tempo/1000) / 4;
    let adj_rank = piece_color === "w" ? 7-rank : rank; //descriptive style ranks
    if (piece_type === PAWN) {
        if (pawn_move && adj_rank > 1) {
            playNote(orchestra[PAWN_STR],0,MODES[pawn_count][file] + (12 * adj_rank) + 12,
            (tempo/1000) * nextPawnMove(),volume);
        }
    }
    else if (turn === piece_color) {
        let p = (piece_type * 2) + (piece_color === "b" ? 1 : 0);
        let beat = audioContext.currentTime + (eights * (file > 3 ? 7 - file : file));
        //playNote(orchestra[RHYTHM],beat,adj_rank + 36, eights, volume);
        //playNote(orchestra[RHYTHM],beat,p + 48, eights, volume/2 + ((volume/2) * (adj_rank/7)));
        playNote(orchestra[RHYTHM],beat,MODES[pawn_count][adj_rank] + (piece_type * 12) + 24, eights, volume);
    }
}

function playFEN(fen,real_time,pawn_move) {
    let fen_str = fen.split(" ")[0].split("/");
    let turn = fen.split(" ")[1];  //console.log(turn); //console.log(fen_str);
    let pawn_count = pawnCount(fen);
    let t = (tempo/1000);

    let chords = [];
    for (let i=0; i<fen_str.length; i++) chords[i] = [];

    for (let rank = 0; rank < fen_str.length; rank++) {
        let file = 0;
        for (let i = 0; i < fen_str[rank].length; i++) {
            let piece_char = fen_str[rank].charAt(i);
            let piece_type = PIECE_CODE.indexOf(piece_char.toLowerCase()); //console.log("Piece Type: " + piece_type);
            let piece_color = pieceColor(PIECE_CODE.indexOf(piece_char));
            if (piece_type === -1) {
                file += parseInt(fen_str[rank].charAt(i));
            }
            else {
                let adj_rank = piece_color === "w" ? 7-rank : rank; //descriptive style ranks
                if (real_time) {
                    if (piece_type === PAWN) {
                        if (adj_rank > 1) {
                            playNote(orchestra[PAWN_STR],0,MODES[pawn_count][file] + (12 * adj_rank) + 12,
                           t * fen_str.length,volume);
                        }
                    }
                    else {
                        chords[file].push(rank + 48); //console.log("File: " + file + " -> " + chords[file]);
                    }
                }
                else playPGNRhythm(piece_type,piece_color,file,rank,pawn_count,pawn_move,turn);
                file++;
            }
        }
    }
    for (let i = 0; i < chords.length; i++) {
        for (let n = 0; n < chords[i].length; n++) {
            let t2 = t/chords[i].length;
            playNote(orchestra[RHYTHM],audioContext.currentTime + (t * i) + (t2 * n), chords[i][n], t, volume);
        }
    }
    if (fen_loop) {
        setTimeout(() => playFEN(document.getElementById("fenBox").value,true),tempo*8);
    }
}

function playGame() {
    player.cancelQueue(audioContext);
    if (!playing) {
        game.load_pgn(document.getElementById("pgnBox").value);
        moves = game.history({ verbose: true }); //console.log(moves);
        game.reset();
        move_num = 0; pawn_moves = 0; current_eval = 0;
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

function nextMove() {
    game.move(moves[move_num]);
    board.position(game.fen());
    document.getElementById("fenBox").value = game.fen();
    if (document.getElementById("chk_extra").checked) { // && game.turn() === "w"
        playFEN(game.fen(),false, moves[move_num].piece === "p");
    }
    if (!document.getElementById("chk_mute").checked) playMove();
    if (playing && ++move_num < moves.length) window.setTimeout(nextMove,tempo);
    else setPlaying(false);
}

function playMove() { //console.log("Playing: " + moves[move_num].from + moves[move_num].to);
    let pitches = getPitches(moves[move_num]);
    if (moves[move_num].color === "b") {
        for (let i=0;i<pitches.length;i++) pitches[i] = 7-pitches[i]; //if (i % 2 == 1)
    }
    let dist = calcDist(pitches[0],pitches[1],pitches[2],pitches[3]); //console.log("Distance:  " + dist);
    let t = tempo/1000;


    if (alberti) playAlbertiBass(CHORDS[PIECE_CODE.indexOf(moves[move_num].piece)]);

    if (moves[move_num].captured) {
        current_key = 60 + PIECE_CODE.indexOf(moves[move_num].piece);
        playNote(orchestra[CAPTURE],0,current_key - 24, t * ((nextCapture() - move_num)+1), volume);
    }
    else current_eval = getEval(game.fen());

    rhythm_flag--;
    let current_mode = MODES[PIECE_CODE.indexOf(moves[move_num].piece)];
    if (moves[move_num].piece === "p") { //console.log("Pawn move!");
        playNote(orchestra[PAWN_STR],0,mapPitch(pitches[2],pitches[3]),t * ((nextPawnMove() - move_num)+1),volume);
        playNote(orchestra[MOVE],0,current_mode[pitches[2]] + current_key, tempo/1000, volume);
        pawn_moves++;
    }
    else if (rhythm_flag <= 0) {
        let r = Math.round(dist)-1; //console.log(dist + ", " + r);
        if (simple_melody) {
            melody += (pitches[1] - pitches[3]);
            rhythm_flag = RHYTHMS[r]; if (rhythm_flag < 1) rhythm_flag = 1;
            playNote(orchestra[MOVE],0,24 + melody,t * rhythm_flag, volume);
        }
        //console.log(pitches); //console.log(current_mode);
        //console.log("To File: " + current_mode[pitches[2]]); //console.log("To Rank: " + current_mode[pitches[3]]);
        if (RHYTHMS[r] < QUARTER) {
            let d = (tempo/1000)/Math.abs(RHYTHMS[r]);
            playNote(orchestra[MOVE],0,current_mode[pitches[2]] + current_key, d, volume);
            playNote(orchestra[MOVE],audioContext.currentTime + d,current_mode[pitches[3]] + current_key,d,volume);
            if (RHYTHMS[r] === TRIPLET) {
                let triplet_pitch = (pitches[0] + pitches[1]); if (triplet_pitch > 12) triplet_pitch = 12;
                playNote(orchestra[MOVE],audioContext.currentTime + (d*2),triplet_pitch + current_key, d, volume);
            }
        }
        else {
            rhythm_flag = RHYTHMS[r]; //console.log("Rhythm: " + rhythm_flag);
            playNote(orchestra[MOVE],0,current_mode[pitches[2]] + current_key, t * rhythm_flag, volume);
            playNote(orchestra[MOVE],0,current_mode[pitches[3]] + current_key, t * rhythm_flag, volume);
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

function calcDist(x1,y1,x2,y2) {
    return Math.sqrt(Math.pow(Math.abs(x1-x2),2) + Math.pow(Math.abs(y1-y2),2));
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

function playNote(i,t,p,d,v) {
    if (playing || fen_loop) player.queueWaveTable(audioContext, audioContext.destination, i,t,p,d,v);
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

function setMode() {
    mode = MODES[document.getElementById("select_mode").selectedIndex]; //console.log("New Mode: " + mode);
}