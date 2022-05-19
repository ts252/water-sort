let history

let everSeen 

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
        return  `<div class="tubec" data-idx="${idx++}"><div class="tube">` + amalgamated.map(({c, n}) => 
            `<div class="c${c}" style="height: ${n}em; background-color: ${palette[c]}"/></div>`
        ).join("") + "</div></div>"        
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
           !(tfrom.length == 4 && tfrom.every(c => c == tfrom[0])) &&
           tto.length < 4 &&
                (tto.length == 0 ||
                tto.at(-1) == tfrom.at(-1))
}

function findNextMove(game, lastFrom, lastTo){
    for(let from = lastFrom; from < game.tubes.length; from++){
        for(let to = from == lastFrom ? lastTo + 1: 0; to < game.tubes.length; to++){
            if(isValidMove(game, from, to)){                
                return {game: move(game, from, to), from, to}
            }
        }
    }    
    return null
}

function step(history){
    const state = history.at(-1)
    let nextMove = state
    while(nextMove != null && everSeen[JSON.stringify(nextMove.game)]){
        nextMove = findNextMove(state.game, nextMove.from, nextMove.to)
    }
    if(!nextMove){
        //backtrack
        if(history.length == 1){
            console.log("UNSOLVEABLE!!")            
            history.impossible = true;            
            return history
        } else {
            history.pop()
            const newstate = history.at(-1)
            newstate.to++
            return step(history)
        }
    } else {
        everSeen[JSON.stringify(nextMove.game)] = true        
        state.from = nextMove.from
        state.to = nextMove.to
        history.push({game: nextMove.game, from: 0, to: -1})
        if(isWon(nextMove.game)){
            console.log(`WIN!!! after ${history.length} moves`)
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
        
    history = [{game, from: 0, to: -1}]
    everSeen = {}
}

function makePalette(n){
    const base = myrng() * 360
    const hs = [base, base + 30, base + 180, base + 210].map(x => x % 360)
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
                history.push({game, from: pendingMove, to})
                const el = $(this).parent().find(".tubec")[pendingMove]
                $(el).addClass("tipping")
                const tippingPos = (to - pendingMove - 1) * $(el).width()
                $(el).css({left: tippingPos})
                
                setTimeout(() => {
                    $(el).removeClass("tipping")
                    $(el).css({left: 0})
                    setTimeout(() => {
                        render(root, game, palette)
                    }, 150)
                }, 300)
                
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
    history.pop()        
    pendingMove = -1
    render(root, history.at(-1).game, palette)
})
$("#new").on("click", () => {
    init(8)
    render(root, history.at(-1).game, palette)
})

let solving 
$("#solve").on("click", () => {    
    everSeen = {}
    pendingMove = -1
    render(root, history[0].game, palette)
    
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
    }, 50)
})

init(8)
palette = makePalette(8)
render(root, history.at(-1).game, palette)