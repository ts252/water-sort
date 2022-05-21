let history

let everSeen 

let numTubes = 5

const myrng = new Math.seedrandom(Date.now());

function pad(a, len){
    return a.slice(0, len).concat(["", "", "", ""].slice(0, len - a.length))
}

function render(root, game, palette){
    let idx = 0;
    root.innerHTML = game.tubes.map(t => {            
        let amalgamated = []
        for(let c of t){
            if(amalgamated.length == 0 || c != amalgamated.at(-1).c){
                amalgamated.push({c, n: 1})
            } else {
                amalgamated.at(-1).n++
            }
        }
        const done = amalgamated.length == 1 && amalgamated[0].n == 4
        return  `<div class="tubec" data-idx="${idx++}">
            <div class="straw ${done ? "visible" : ""}">
                <div class="stem"></div><div class="mouthpiece"></div>
            </div>
            <div class="topmask">
                <div class="tube">` + amalgamated.map(({c, n}) => 
                    `<div class="water c${c} n${n}" style="background-color: ${palette[c]}"/></div>`
                    ).join("") + 
            "</div></div></div>"        
    }).join("\n")
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(myrng() * (i + 1));  
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function move(game, from, to){        
    let copy = {
        tubes: game.tubes.map(t => t.slice(0))
    }
    const tfrom = copy.tubes[from]
    const tto = copy.tubes[to]
    while(tto.length < 4 && (tto.length == 0 || tto.at(-1) == tfrom.at(-1))){
        tto.push(tfrom.pop())
    }
    return copy;
}

function isValidMove(game, from, to){
    const tfrom = game.tubes[from]
    const tto = game.tubes[to]
    return from != to &&
           tfrom.length != 0 &&           
           tto.length < 4 &&
                (tto.length == 0 ||
                tto.at(-1) == tfrom.at(-1))
}

function isSensibleMove(game, from, to){
    const tfrom = game.tubes[from]
    const tto = game.tubes[to]
    return from != to &&
           tfrom.length != 0 &&
           !(tfrom.length == 4 && tfrom.every(c => c == tfrom[0])) &&
           !(tto.length == 0 && tfrom.every(c => c == tfrom[0])) &&
           tto.length < 4 &&
                (tto.length == 0 ||
                tto.at(-1) == tfrom.at(-1))
}

function calcScore(game){
    return game.tubes.map(t => {
        if(t.length == 0){
            return 2
        } else {
            let score = 1;
            for(let j = t.length - 1; j >= 0; j--){
                if(t[j] == t.at(-1)) {
                    ++score
                    if(j == 0){
                        score *= score
                    }
                } else {
                    break;
                }
            }
            return score;
        }
    }).reduce((a, b) => a + b)
}

function calculateMoves(game){
    let moves = []
    for(let from = 0; from < game.tubes.length; from++){
        for(let to = 0; to < game.tubes.length; to++){
            if(isSensibleMove(game, from, to)){                
                const afterMove = move(game, from, to)
                moves.push({game: afterMove, from, to, score: calcScore(afterMove)})
            }
        }
    }    

    moves.sort((a, b) => b.score - a.score)
    return moves
}

function step(history){
    ++steps
    const state = history.at(-1)
    let nextMove = state
    while(nextMove && everSeen[JSON.stringify(nextMove.game)]){
        nextMove = state.moves[state.moveIdx++]
    }
    if(!nextMove){
        //backtrack
        if(history.length == 1){
            console.log("UNSOLVEABLE!!")            
            history.impossible = true;            
            return history
        } else {
            history.pop()
            ++undos
            const newstate = history.at(-1)
            newstate.to++
            return step(history)
        }
    } else {
        everSeen[JSON.stringify(nextMove.game)] = true        
        state.from = nextMove.from
        state.to = nextMove.to
        history.push({game: nextMove.game, moves: calculateMoves(nextMove.game), moveIdx: 0})
        if(isWon(nextMove.game)){
            console.log(`WIN!!! after ${steps} steps, ${undos} undos: solved in ${history.length} moves`)
            history.won = true;
        }
        return history;
    }
}

function isWon(game){
    return game.tubes.every(t => (t.length == 4 || t.length == 0) && t.every(x => x == t[0]))
}

function init(nColours){
    let game = {
        tubes: []
    }

    userUndos = 0
    $("#undos").html("")
    
    let contents = []
    for(let i = 0; i < nColours; i++){
        for(let j = 0; j < 4; j++){
            contents.push(i)
        }
    }
    shuffle(contents)

    for(let i = 0; i < nColours; i++){
        game.tubes.push(contents.slice(i * 4, i * 4 + 4))
    }
    game.tubes.push([])
    game.tubes.push([])
        
    history = [{game, moves: calculateMoves(game), moveIdx: 0}]
    everSeen = {}
    steps = 0
    undos = 0
    while(!history.won && !history.impossible){
        history = step(history)
    }
    $("#difficulty").html(`Difficulty: ${Math.round(steps / numTubes / numTubes * 10)}`)
    history.length = 1
}

function makePalette(n){
    const base = myrng() * 360
    const hs = [base, base + 40, base + 180, base + 230].map(x => x % 360)
    const svs = [55, 30, 80]
    
    rv = []
    for(const sv of svs){
        for(const h of hs){
            rv.push(`hsl(${h}deg ${sv}% ${sv}%)`)
        }
    }
    return rv;
}

let pendingMove = -1
let palette 
let root = document.querySelector("#game")

$("#game").on("click",".tubec",function(){
    let game = history.at(-1).game
    if($(this).hasClass("selected")){
        $(this).removeClass("selected")
        pendingMove = -1
    } else {
        if(pendingMove > -1){
            let to = $(this).data("idx") - 0
            if(isValidMove(game, pendingMove, to)){
                game = move(game, pendingMove, to)
                history.push({game, moves: calculateMoves(game), moveIdx: 0, from: pendingMove, to})
                const el = $(this).parent().find(".tubec")[pendingMove]
                $(el).addClass("tipping")
                const tippingPos = (to - pendingMove - 1) * $(el).width()
                $(el).css({left: tippingPos})

                const dest = $($(this).parent().find(".tubec")[to]).find(".tube")
                const grower = $(el).find(".tube div:last-child").clone().addClass("new")
                grower.appendTo(dest)
                setTimeout(() => {
                    grower.removeClass("new")
                }, 1)

                if(game.tubes[to].length == 4 && 
                    game.tubes[to].every(c => c == game.tubes[to][0])){
                    dest.closest(".tubec").find(".straw").addClass("visible")
                }
                
                setTimeout(() => {
                    $(el).removeClass("tipping")
                    $(el).css({left: 0})
                    setTimeout(() => {
                        render(root, game, palette)
                    }, 150)
                }, 400)
                
            } else {                
                $(".selected").removeClass("selected")                
            }
            pendingMove = -1
        } else {
            pendingMove = $(this).data("idx") - 0
            $(this).addClass("selected")
        }
            
    }
})

$("#reset").on("click", () => {
    history = [{game: history[0].game, from: 0, to: -1}]
    everSeen = {}
    pendingMove = -1
    render(root, history[0].game, palette)
})
$("#undo").on("click", () => {
    if(history.length < 2) return;
    history.pop()        
    pendingMove = -1
    render(root, history.at(-1).game, palette)    
    $("#difficulty").html("Undo!")
    $("#undos").html("(" + ++userUndos + ")")
})
$("#new").on("click", () => {
    init(numTubes)
    render(root, history.at(-1).game, palette)
})

let solving, steps, undos
$("#solve").on("click", () => {    
    everSeen = {}
    pendingMove = -1
    steps = 0
    undos = 0
    let game = history.at(-1).game
    let fromHere = [{game, moves:calculateMoves(game), moveIdx: 0}]
    while(!fromHere.won && !fromHere.impossible){
        fromHere = step(fromHere)
    }    
    if(fromHere.won){
        history.push(fromHere[2])
        render(root, history.at(-1).game, palette)
    } else {
        $("#difficulty").html("Can't solve from here!")
    }

}) /*
    
    solving = setInterval(() => {
        if(!history.won && !history.impossible){
            history = step(history)
            if(history.impossible){
                render(root, history[0].game, palette)            
            } else {
                render(root, history.at(-1).game, palette)            
            }
        } else {
            clearTimeout(solving)
        }
    }, 3)
})*/
const divInstall = document.getElementById('installContainer');
const butInstall = document.getElementById('butInstall');


window.addEventListener('beforeinstallprompt', (event) => {
    // Prevent the mini-infobar from appearing on mobile.
    event.preventDefault();
    console.log('👍', 'beforeinstallprompt', event);
    // Stash the event so it can be triggered later.
    window.deferredPrompt = event;
    // Remove the 'hidden' class from the install button container.
    divInstall.classList.toggle('hidden', false);
  });

  butInstall.addEventListener('click', async () => {
    console.log('👍', 'butInstall-clicked');
    const promptEvent = window.deferredPrompt;
    if (!promptEvent) {
      // The deferred prompt isn't available.
      return;
    }
    // Show the install prompt.
    promptEvent.prompt();
    // Log the result
    const result = await promptEvent.userChoice;
    console.log('👍', 'userChoice', result);
    // Reset the deferred prompt variable, since
    // prompt() can only be called once.
    window.deferredPrompt = null;
    // Hide the install button.
    divInstall.classList.toggle('hidden', true);
  });

  window.addEventListener('appinstalled', (event) => {
    console.log('👍', 'appinstalled', event);
    // Clear the deferredPrompt so it can be garbage collected
    window.deferredPrompt = null;
  });


$("#numTubes").on("change", function(){
    numTubes = $(this).val()-0
    init(numTubes)
    palette = makePalette(numTubes)
    render(root, history.at(-1).game, palette)
})

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js');
}

init(numTubes)
palette = makePalette(numTubes)
render(root, history.at(-1).game, palette)

