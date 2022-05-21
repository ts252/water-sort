"use strict"
let history

let numTubes = 5
let userUndos = 0
let activeSolution

const myrng = new Math.seedrandom(Date.now());

const $ = x => document.querySelector(x)
const filterHandler = (sel, h) => (evt => {
    const el = evt.path.find(e => e.matches(sel))
    if(el){
        return h(el)
    }
})

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

const solver = (() => {
    let everSeen = {}
    let steps = 0
    let undos = 0
    
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

    function step(decisionTree){
        ++steps
        const state = decisionTree.at(-1)
        let nextMove = state
        while(nextMove && everSeen[JSON.stringify(nextMove.game)]){
            nextMove = state.moves[state.moveIdx++]
        }
        if(!nextMove){
            //backtrack
            if(decisionTree.length == 1){
                console.log("UNSOLVEABLE!!")            
                decisionTree.impossible = true;            
                return decisionTree
            } else {
                decisionTree.pop()
                ++undos
                const newstate = decisionTree.at(-1)
                newstate.to++
                return step(decisionTree)
            }
        } else {
            everSeen[JSON.stringify(nextMove.game)] = true        
            state.from = nextMove.from
            state.to = nextMove.to
            decisionTree.push({game: nextMove.game, moves: calculateMoves(nextMove.game), moveIdx: 0})
            if(isWon(nextMove.game)){
                console.log(`WIN!!! after ${steps} steps, ${undos} undos: solved in ${decisionTree.length} moves`)
                decisionTree.won = true;
            }
            return decisionTree;
        }
    }

    function isWon(game){
        return game.tubes.every(t => (t.length == 4 || t.length == 0) && t.every(x => x == t[0]))
    }

    function solve(game){
        everSeen = {}
        undos = 0
        steps = 0
        let decisionTree = [{game, moves: calculateMoves(game), moveIdx: 0}]
        while(!decisionTree.won && !decisionTree.impossible){
            decisionTree = step(decisionTree)
        }

        if(!decisionTree.won){
            return null
        }
        
        const solution = decisionTree.map((h) => {
            return {from: h.from, to: h.to, game: h.game}
        }).reverse().slice(0, -2)
        
        return {solution, steps, undos}
    }

    return {isWon, solve}
})()

function init(nColours){
    let game = {
        tubes: []
    }

    userUndos = 0
    $("#undos").innerHTML = ""
    
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
        
    history = [{game}]
    
    const {solution, steps, undos} = solver.solve(game)
    activeSolution = solution
    $("#difficulty").innerHTML = `Difficulty: ${Math.round(steps / numTubes / numTubes * 10)}`    
}

function makePalette(n){
    const base = myrng() * 360
    const hs = [base, base + 40, base + 180, base + 230].map(x => x % 360)
    const svs = [55, 30, 80]
    
    let rv = []
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

$("#game").addEventListener("click", filterHandler(".tubec", (el) => {
    let game = history.at(-1).game
    if(el.classList.contains("selected")){
        el.classList.remove("selected")
        pendingMove = -1
    } else {
        if(pendingMove > -1){
            let to = el.getAttribute("data-idx") - 0
            if(isValidMove(game, pendingMove, to)){
                activeSolution = null
                game = move(game, pendingMove, to)
                history.push({game, from: pendingMove, to})
                const fromEl = el.parentNode.querySelectorAll(".tubec")[pendingMove]
                fromEl.classList.add("tipping")
                const tippingPos = (to - pendingMove - 1) * el.clientWidth
                fromEl.setAttribute("style", `left: ${tippingPos}px`);

                const dest = el.parentNode.querySelectorAll(".tubec")[to].querySelector(".tube")
                const grower = fromEl.querySelector(".tube div:last-child").cloneNode(true)
                grower.classList.add("new")
                dest.appendChild(grower)
                setTimeout(() => {
                    grower.classList.remove("new")
                }, 1)

                if(game.tubes[to].length == 4 && 
                    game.tubes[to].every(c => c == game.tubes[to][0])){
                    el.parentNode.querySelectorAll(".tubec")[to]    
                        .querySelector(".straw")
                        .classList.add("visible")
                }
                
                setTimeout(() => {
                    fromEl.classList.remove("tipping")
                    fromEl.setAttribute("style", "left: 0")
                    setTimeout(() => {
                        fromEl.querySelector("div.water:last-child").remove()
                        
                        //@@@should not be necessary but there are bugs pouring n>1 waters
                        render(root, game, palette)
                    }, 150)
                }, 400)            
            }          

            document.querySelectorAll(".selected").forEach(el => {el.classList.remove("selected")})
            pendingMove = -1        
        } else {
            pendingMove = el.getAttribute("data-idx") - 0
            el.classList.add("selected")
        }
            
    }
}))

$("#reset").addEventListener("click", () => {
    history = [{game: history[0].game}]
    everSeen = {}
    pendingMove = -1
    userUndos = 0
    activeSolution = null
    $("#undos").innerHTML = ""
    render(root, history[0].game, palette)
})
$("#undo").addEventListener("click", () => {
    if(history.length < 2) return;
    history.pop()        
    pendingMove = -1
    activeSolution = null
    render(root, history.at(-1).game, palette)    
    $("#difficulty").innerHTML = "Undo!"
    $("#undos").innerHTML = "(" + ++userUndos + ")"
})
$("#new").addEventListener("click", () => {
    init(numTubes)
    render(root, history.at(-1).game, palette)
})

let solving, steps, undos
$("#solve").addEventListener("click", () => {        
    if(!activeSolution){
        const stats = solver.solve(history.at(-1).game)        
        
        if(!stats){
            $("#difficulty").innerHTML = "Can't solve from here!"
            activeSolution = null
        } else {
            activeSolution = stats.solution            
        }
    } 
    
    if(activeSolution){
        history.push(activeSolution.pop())            
    }
    
    render(root, history.at(-1).game, palette)
}) 

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


$("#numTubes").addEventListener("change", function(){
    numTubes = this.value - 0
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

