import { MiniMaple } from './miniMaple';

const mm = new MiniMaple();

function setup(): void {
  const input = document.getElementById('input') as HTMLInputElement;
  const button = document.getElementById('demoButton') as HTMLButtonElement;
  const output = document.getElementById('output') as HTMLPreElement;

  const run = (): void => {
    output.classList.remove('error');
    const raw = input.value;
    const idx = raw.lastIndexOf(',');
    if (idx === -1) {
      output.classList.add('error');
      output.textContent = 'Ожидается формат: <выражение>, <переменная>';
      return;
    }
    const expr = raw.slice(0, idx).trim();
    const variable = raw.slice(idx + 1).trim();
    try {
      output.textContent = mm.diff(expr, variable);
    } catch (err) {
      output.classList.add('error');
      output.textContent = `Ошибка: ${(err as Error).message}`;
    }
  };

  button.onclick = run;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') run();
  });
}

document.addEventListener('DOMContentLoaded', setup);
