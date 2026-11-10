// Color palette matching the visual design[cite: 37]
export const PLAYER_PALETTE = [
  '#22c55e', // Slot 0: Green (Nathan)
  '#ef4444', // Slot 1: Red (Josh)
  '#2563eb', // Slot 2: Blue (Amira)
  '#eab308', // Slot 3: Yellow (Lorraine)
  '#9333ea', // Slot 4: Purple (Jeff)
  '#06b6d4', // Slot 5: Cyan (Anson)
  '#d946ef', // Slot 6: Magenta/Pink (Lars)
  '#ea580c'  // Slot 7: Orange (Jhervis)
];

const MOCK_NAMES = [
  'Nathan', 'Josh', 'Amira', 'Lorraine', 
  'Jeff', 'Anson', 'Lars', 'Jhervis'
];

let activeCount = 0;

// SVG block template
function buildIsoBlockSVG(slotIndex) {
  return `
    <svg viewBox="0 0 400 220" class="iso-block is-idle" id="block-${slotIndex}">
      <!-- 1. Ground Shadow (Isometric Floor Projection) -->
      <polygon class="face-shadow" points="60,185 240,80 340,138 160,243" />
      
      <!-- 2. Front Cap Face -->
      <polygon class="face-front" points="60,140 100,163 100,203 60,180" />
      <text class="text-initial" x="80" y="185"></text>

      <!-- 3. Top Face -->
      <polygon class="face-top" points="60,140 240,36 280,59 100,163" />

      <!-- 4. Long Side Face -->
      <polygon class="face-side" points="100,163 280,59 280,99 100,203" />
      <text class="text-name" x="125" y="160"></text>
    </svg>
  `;
}

// Initialize all 8 slots into visible idle grey blocks
export function initCodeblockLobby() {
  document.querySelectorAll('#lobby-cdblck .block-slot').forEach((slotEl) => {
    const slotIndex = parseInt(slotEl.dataset.slot, 10);
    slotEl.innerHTML = buildIsoBlockSVG(slotIndex);
  });

  // Attach mock dev controls
  document.getElementById('dev-btn-add')?.addEventListener('click', () => {
    if (activeCount < 8) {
      occupyBlock(activeCount, MOCK_NAMES[activeCount]);
      activeCount++;
    }
  });

  document.getElementById('dev-btn-remove')?.addEventListener('click', () => {
    if (activeCount > 0) {
      activeCount--;
      vacateBlock(activeCount);
    }
  });

  document.getElementById('dev-btn-reset')?.addEventListener('click', () => {
    for (let i = 0; i < 8; i++) vacateBlock(i);
    activeCount = 0;
  });
}

// Occupy block with player data[cite: 5, 37]
export function occupyBlock(slotIndex, nickname) {
  const block = document.getElementById(`block-${slotIndex}`);
  if (!block || !nickname) return;

  const color = PLAYER_PALETTE[slotIndex % PLAYER_PALETTE.length];
  block.style.setProperty('--block-color', color);
  block.classList.remove('is-idle');
  block.classList.add('is-active');

  const initial = nickname.trim().charAt(0).toUpperCase();
  block.querySelector('.text-initial').textContent = initial;
  block.querySelector('.text-name').textContent = nickname;
}

// Vacate block back to grey[cite: 5, 9]
export function vacateBlock(slotIndex) {
  const block = document.getElementById(`block-${slotIndex}`);
  if (!block) return;

  block.style.removeProperty('--block-color');
  block.classList.remove('is-active');
  block.classList.add('is-idle');

  block.querySelector('.text-initial').textContent = '';
  block.querySelector('.text-name').textContent = '';
}