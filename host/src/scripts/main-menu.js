function initializeMainMenu() {
    let mainMenuButtons = document.querySelectorAll('button'); //gets all the data mode values for buttons

    // Add event listeners to each button
    mainMenuButtons.forEach(button => { 
        button.addEventListener('click', function() {
            // Get the data-mode and data-info attributes of the clicked button
            // No value or function is being returned, just logging to the console
            let mode = button.getAttribute('data-mode');
            let info = button.getAttribute('data-info');
            console.log(`Button clicked: Mode = ${mode}, Info = ${info}`);

            // Toggle the 'selected' class on the clicked button
            if (!button.classList.contains('selected')) {
                button.classList.add('selected');
            } else {
                button.classList.remove('selected');
            }
        });
    })
    
    const dino = document.querySelector("#dino-roamer");
    const dinoImage = dino?.querySelector(".pixel-dino");
    const ambient = document.querySelector("#ambient-code");
    const box = document.querySelector("#box-container");

    let previousX = 0;

    window.addEventListener("pointermove", (event) => {
    if (!dino || !ambient || !box) return;

    const ambientRect = ambient.getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();

    const dinoWidth = dino.offsetWidth;
    const dinoHeight = dino.offsetHeight;

    // Keep the dinosaur inside the background horizontally
    const minX = 24;
    const maxX = ambientRect.width - dinoWidth - 24;

    // Keep it above the folder box
    const minY = 90;
    const maxY = Math.max(
        minY,
        boxRect.top - ambientRect.top - dinoHeight - 24
    );

    // Position relative to the ambient background
    const targetX = Math.max(
        minX,
        Math.min(event.clientX - ambientRect.left - dinoWidth / 2, maxX)
    );

    const targetY = Math.max(
        minY,
        Math.min(event.clientY - ambientRect.top - dinoHeight / 2, maxY)
    );

    dino.style.left = `${targetX}px`;
    dino.style.top = `${targetY}px`;

    // Face the direction of movement
    if (dinoImage && Math.abs(targetX - previousX) > 2) {
        dinoImage.style.transform =
        targetX < previousX ? "scaleX(-1)" : "scaleX(1)";
    }

    previousX = targetX;
    });

}

initializeMainMenu();