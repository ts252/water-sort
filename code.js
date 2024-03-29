"use strict"
let history

let numTubes = 5
let userUndos = 0
let activeSolution

const myrng = new Math.seedrandom(Date.now());


const $ = x => document.querySelector(x)
const filterHandler = (sel, h) => (evt => {
    let t = evt.target
    while(t && !t.matches(sel)){
        t = t.parentNode
    }
    if(t){
        return h(t)
    }
})

function render(root, game, palette){
    const perRowMap = {
        0: 0,
        1: 1,
        2: 2,
        3: 3,
        4: 2,
        5: 3,
        6: 3,
        7: 4,
        8: 4,
        9: 5,
        10: 5,
        11: 6,
        12: 6,
        13: 5,
        14: 5,
        15: 5,
        16: 6,
        17: 6,
        18: 6
    }
    const perRow = perRowMap[game.tubes.length]

    let idx = 0;
    const tubehtml = game.tubes.map(t => {
        let amalgamated = []
        for(let c of t){
            if(amalgamated.length == 0 || c != amalgamated.at(-1).c){
                amalgamated.push({c, n: 1})
            } else {
                amalgamated.at(-1).n++
            }
        }
        const done = amalgamated.length == 1 && amalgamated[0].n == 4
        return  `<div class="growable"><div class="tubec ${pendingMove == idx ? "selected" : ""}" data-idx="${idx++}">
            <div class="straw ${done ? "visible" : ""}">
                <div class="stem"></div><div class="mouthpiece"></div>
            </div>
            <div class="topmask">
                <div class="tube">` + amalgamated.map(({c, n}) =>
                    `<div class="water c${c} n${n}" style="background-color: ${palette[c]}"/></div>`
                    ).join("") +
            `</div></div><div class="drip"></div></div></div>`
    })
    let rows = []
    for(let i = 0; i < tubehtml.length + perRow; i += perRow){
        rows.push(`<div class="row">${tubehtml.slice(i, i + perRow).join("\n")}</div>`)
    }
    root.innerHTML = rows.join("\n")
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
    showMessage(`Difficulty: ${Math.round(steps / numTubes / numTubes * 10)}`    )
}

function makePalette(n){
    return ['#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c','#fdbf6f','#ff7f00','#cab2d6','#6a3d9a','#ffff99','#b15928'];
}

let pendingMove = -1
let palette
let root = document.querySelector("#game")

function animatePour(game, el, from, to){
    const fromEl = document.querySelector(`.tubec[data-idx="${from}"]`)
    const tippingPosX = el.offsetLeft - fromEl.offsetLeft - 58
    const tippingPosY = el.parentNode.parentNode.offsetTop - fromEl.parentNode.parentNode.offsetTop - 7
    fromEl.setAttribute("style", `left: ${tippingPosX}px; top: ${tippingPosY}px`);

    fromEl.classList.add("tipping")
    const dest = document.querySelector(`.tubec[data-idx="${to}"]`)
    const grower = fromEl.querySelector(".tube div:last-child").cloneNode(true)
    grower.classList.add("new")
    dest.querySelector(".tube").appendChild(grower)
    dest.querySelector(".drip").setAttribute("style",
        grower.getAttribute("style"))
    dest.classList.add("receiving")
    setTimeout(() => {
        grower.classList.remove("new")
    }, 1)

    if(game.tubes[to].length == 4 &&
        game.tubes[to].every(c => c == game.tubes[to][0])){
        dest.querySelector(".straw")
            .classList.add("visible")
    }

    setTimeout(() => {
        fromEl.classList.remove("tipping")
        fromEl.setAttribute("style", "left: 0")
        setTimeout(() => {
            fromEl.querySelector("div.water:last-child").remove()
            dest.classList.remove("receiving")

            if(game.tubes.every(t => t.length == 0 || (t.length == 4 && t.every(c => c == t[0])))){
                winAnimation()
                showMessage("Awesome!")
            }

            //@@@should not be necessary but there are bugs pouring n>1 waters
            setTimeout(() => {
                render(root, game, palette)
            }, 100);
        }, 150)
    }, 600)

}

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
                animatePour(game, el, pendingMove, to)
            }

            document.querySelectorAll(".selected").forEach(el => {el.classList.remove("selected")})
            pendingMove = -1
        } else {
            pendingMove = el.getAttribute("data-idx") - 0
            el.classList.add("selected")
        }

    }
}))

let hideMessageHandle
function showMessage(msg){
    $("#difficulty").innerHTML = msg
    $("#difficulty").classList.add("visible")
    if(hideMessageHandle){
        clearTimeout(hideMessageHandle)
    }
    hideMessageHandle = setTimeout(() => {
        $("#difficulty").classList.remove("visible")
    }, 4000)
}

$("#reset").addEventListener("click", () => {
    history = [{game: history[0].game}]
    pendingMove = -1
    userUndos = 0
    activeSolution = null
    showMessage("Reset!")
    $("#undos").innerHTML = ""
    render(root, history[0].game, palette)
})
$("#undo").addEventListener("click", () => {
    if(history.length < 2) return;
    history.pop()
    pendingMove = -1
    activeSolution = null
    render(root, history.at(-1).game, palette)
    showMessage("Undo!")
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
            showMessage("Can't solve from here!")
            activeSolution = null
        } else {
            activeSolution = stats.solution
        }
    }

    if(activeSolution){
        history.push(activeSolution.pop())
    }

    render(root, history.at(-1).game, palette)

    if(history.at(-1).game.tubes.every(t => t.length == 0 || (t.length == 4 && t.every(c => c == t[0])))){
        winAnimation()
        showMessage("I solved it! Can you?")
    }
})

function getTubePos(idx){
    const el = document.querySelector(`.tubec[data-idx="${idx}"]`)
    return {
        x: (el.offsetLeft + el.offsetWidth / 2) / window.innerWidth,
        y: (el.offsetTop + el.offsetHeight * 2 / 3) / window.innerHeight
    }
}

function winAnimation(){
    let delay = 400
    let increment = 200
    let baseline = 200
    let idx = 0
    for(const t of history.at(-1).game.tubes){
        if(t.length){
            let pos = getTubePos(idx++)
            setTimeout(() => {
                confetti({
                    particleCount: 20,
                    colors: [palette[t[0]]],
                    useWorker: true,
                    origin: pos
                })
            }, Math.round(delay))
            delay += increment + baseline
            increment = increment * 0.8
        } else {
            ++idx
        }
    }
}

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
    navigator.serviceWorker.register('service-worker.js');
}

init(numTubes)
palette = makePalette(numTubes)
render(root, history.at(-1).game, palette)

