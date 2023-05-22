/* <img src=\"immagine_finta.jpg\" onerror=\"alert('ciao a tutti')\" /> */
/* <img src=\"immagine_finta.jpg\" onerror=\"(() => {let a = 10;a += 50;console.log(a);})()\" /> */
/* <img src=\"immagine_finta.jpg\" onerror=\"

(() => {
    let table = document.getElementById('grades');
    let len = table.childNodes.length;
    if (len > 0) {
        table.removeChild(table.childNodes[len-1]);
    }
})()

\" /> */


