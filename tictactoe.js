let boxes = document.querySelectorAll(".box");
let reset =  document.querySelector("#reset");
let newGame = document.querySelector("#neew");
let msgContainer = document.querySelector(".msg-Container");
let msg = document.querySelector("#msg");
let turn1 =true; // player X,1



const  winPatterns = [
    [0, 1, 2] ,
    [0, 3, 6] ,
    [3, 4, 5],
    [6, 7, 8],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
];
    const resetGame = () => {
       turn1 = true;
       enableBoxes();
       msg.innerText = ""; 
       msgContainer.classList.add("hide");
 };

boxes.forEach((box) => {
    box.addEventListener("click" , () => {
        
        if(turn1){
            box.innerText = "0";
            turn1 = false;
        } else {
            box.innerText = 'X';
            turn1 = true;

        }
        box.disabled = true;

        checkWinner(); 
    });
});
    const disableBoxes = () => {
            for(let box of boxes) {
                box.disabled = true;
            }
    };
    const enableBoxes = () => {
            for(let box of boxes) {
                box.disabled = false;
                box.innerText = "";
            }
    };

    const showWinner = (Winner) => {
       msg.innerText =  `congratulations , Winner is ${Winner}`;

        msgContainer.classList.remove("hide");
        disableBoxes();
    }
    const checkWinner = () => {
    for (let pattern of winPatterns) {
       
         let pos1val = boxes[pattern[0]].innerText;
         let pos2val = boxes[pattern[1]].innerText;
         let pos3val =  boxes[pattern[2]].innerText;

        if(pos1val != "" && pos2val != "" && pos3val != ""){
            if (pos1val == pos2val && pos2val == pos3val){
                
                showWinner(pos1val);
            }
        }
    }
 };
 
 
newGame.addEventListener("click",resetGame);
reset.addEventListener("click",resetGame);
