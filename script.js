const hoursRing = document.getElementById('hours-ring');
const minutesRing = document.getElementById('minutes-ring');
const secondsRing = document.getElementById('seconds-ring');

function pad(value) {
	return String(value).padStart(2, '0');
}

function createRing(ringElement, total, radius, formatter) {
	for (let index = 0; index < total; index += 1) {
		const tick = document.createElement('div');
		tick.className = 'tick';
		tick.textContent = formatter(index);

		const angle = (index / total) * 360;
		tick.dataset.angle = String(angle);
		tick.dataset.radius = String(radius);
		tick.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translateY(-${radius}px) rotate(-${angle}deg)`;

		ringElement.appendChild(tick);
	}
}

createRing(hoursRing, 12, 335, (value) => String(value === 0 ? 12 : value));
createRing(minutesRing, 60, 260, (value) => pad(value));
createRing(secondsRing, 60, 185, (value) => pad(value));

function rotateRingWithAlignedNumbers(ringElement, rotationDeg) {
	ringElement.style.transform = `rotate(${rotationDeg}deg)`;

	const ticks = ringElement.querySelectorAll('.tick');
	ticks.forEach((tick) => {
		const angle = Number(tick.dataset.angle || 0);
		const radius = Number(tick.dataset.radius || 0);
		tick.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translateY(-${radius}px) rotate(${-angle - rotationDeg}deg)`;
	});
}

function updateClock() {
	const now = new Date();
	const seconds = now.getSeconds();
	const minutes = now.getMinutes();
	const hours = now.getHours() % 12;

	rotateRingWithAlignedNumbers(hoursRing, -((hours / 12) * 360));
	rotateRingWithAlignedNumbers(minutesRing, -((minutes / 60) * 360));
	rotateRingWithAlignedNumbers(secondsRing, -((seconds / 60) * 360));
}

updateClock();
setInterval(updateClock, 1000);
