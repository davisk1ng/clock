const hoursRing = document.getElementById('hours-ring');
const minutesRing = document.getElementById('minutes-ring');
const secondsRing = document.getElementById('seconds-ring');
const clockElement = document.querySelector('.clock');
const secondsToggle = document.getElementById('seconds-toggle');

const ringSizes = {
	withSeconds: {
		hours: 335,
		minutes: 260,
		seconds: 185,
	},
	withoutSeconds: {
		hours: 280,
		minutes: 215,
	},
};

const NETWORK_TIME_ENDPOINTS = [
	'https://worldtimeapi.org/api/ip',
	'https://timeapi.io/api/Time/current/zone?timeZone=UTC',
];
const NETWORK_RESYNC_INTERVAL_MS = 10 * 60 * 1000;

let clockBaseTimeMs = null;
let basePerformanceNowMs = 0;
let previousSecond = null;
let previousMinute = null;
let previousHour = null;
let secondCycles = 0;
let minuteCycles = 0;
let hourCycles = 0;
let firstRenderComplete = false;
let clockTickTimeoutId = null;
let clockTickIntervalId = null;

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

function setRingRadius(ringElement, radius) {
	const ticks = ringElement.querySelectorAll('.tick');
	ticks.forEach((tick) => {
		const angle = Number(tick.dataset.angle || 0);
		tick.dataset.radius = String(radius);
		tick.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translateY(-${radius}px) rotate(-${angle}deg)`;
	});
}

function applyClockLayout(showSeconds) {
	if (showSeconds) {
		clockElement.classList.remove('no-seconds');
		setRingRadius(hoursRing, ringSizes.withSeconds.hours);
		setRingRadius(minutesRing, ringSizes.withSeconds.minutes);
		setRingRadius(secondsRing, ringSizes.withSeconds.seconds);
		return;
	}

	clockElement.classList.add('no-seconds');
	setRingRadius(hoursRing, ringSizes.withoutSeconds.hours);
	setRingRadius(minutesRing, ringSizes.withoutSeconds.minutes);
}

function rotateRingWithAlignedNumbers(ringElement, rotationDeg) {
	ringElement.style.transform = `rotate(${rotationDeg}deg)`;

	const ticks = ringElement.querySelectorAll('.tick');
	ticks.forEach((tick) => {
		const angle = Number(tick.dataset.angle || 0);
		const radius = Number(tick.dataset.radius || 0);
		tick.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translateY(-${radius}px) rotate(${-angle - rotationDeg}deg)`;
	});
}

function clearClockTicker() {
	if (clockTickTimeoutId !== null) {
		clearTimeout(clockTickTimeoutId);
		clockTickTimeoutId = null;
	}

	if (clockTickIntervalId !== null) {
		clearInterval(clockTickIntervalId);
		clockTickIntervalId = null;
	}
}

function startClockTicker() {
	clearClockTicker();

	const now = getClockNow();
	const delayToNextSecond = 1000 - now.getMilliseconds();

	clockTickTimeoutId = setTimeout(() => {
		updateClock();
		clockTickIntervalId = setInterval(updateClock, 1000);
	}, delayToNextSecond);
}

function setClockBaseTime(timeMs) {
	clockBaseTimeMs = timeMs;
	basePerformanceNowMs = performance.now();
}

function getClockNow() {
	if (clockBaseTimeMs !== null) {
		const elapsedMs = performance.now() - basePerformanceNowMs;
		return new Date(clockBaseTimeMs + elapsedMs);
	}

	return new Date();
}

function parseNetworkTime(payload) {
	if (payload && typeof payload === 'object') {
		if (typeof payload.unixtime === 'number') {
			return payload.unixtime * 1000;
		}

		if (typeof payload.datetime === 'string') {
			const parsed = Date.parse(payload.datetime);
			if (!Number.isNaN(parsed)) {
				return parsed;
			}
		}

		if (
			typeof payload.year === 'number' &&
			typeof payload.month === 'number' &&
			typeof payload.day === 'number' &&
			typeof payload.hour === 'number' &&
			typeof payload.minute === 'number' &&
			typeof payload.seconds === 'number'
		) {
			return Date.UTC(
				payload.year,
				payload.month - 1,
				payload.day,
				payload.hour,
				payload.minute,
				payload.seconds,
				typeof payload.milliSeconds === 'number' ? payload.milliSeconds : 0,
			);
		}
	}

	return null;
}

async function fetchNetworkTimeMs() {
	for (const endpoint of NETWORK_TIME_ENDPOINTS) {
		try {
			const response = await fetch(endpoint, { cache: 'no-store' });
			if (!response.ok) {
				continue;
			}

			const payload = await response.json();
			const parsedTime = parseNetworkTime(payload);

			if (parsedTime !== null) {
				return parsedTime;
			}
		} catch (error) {
			continue;
		}
	}

	return null;
}

async function syncClockWithNetwork() {
	const networkTimeMs = await fetchNetworkTimeMs();
	if (networkTimeMs !== null) {
		setClockBaseTime(networkTimeMs);
	}
}

function updateClock() {
	const now = getClockNow();
	const rawSeconds = now.getSeconds();
	const rawMinutes = now.getMinutes();
	const rawHours = now.getHours() % 12;
	const showSeconds = secondsToggle.checked;

	if (previousSecond !== null && rawSeconds < previousSecond) {
		secondCycles += 1;
	}

	if (previousMinute !== null && rawMinutes < previousMinute) {
		minuteCycles += 1;
	}

	if (previousHour !== null && rawHours < previousHour) {
		hourCycles += 1;
	}

	const displaySeconds = rawSeconds + secondCycles * 60;
	const displayMinutes = rawMinutes + minuteCycles * 60;
	const displayHours = rawHours + hourCycles * 12;

	previousSecond = rawSeconds;
	previousMinute = rawMinutes;
	previousHour = rawHours;

	rotateRingWithAlignedNumbers(hoursRing, -(displayHours * 30));
	rotateRingWithAlignedNumbers(minutesRing, -(displayMinutes * 6));

	if (showSeconds) {
		rotateRingWithAlignedNumbers(secondsRing, -(displaySeconds * 6));
	}

	if (!firstRenderComplete) {
		clockElement.classList.add('motion-enabled');
		firstRenderComplete = true;
	}
}

secondsToggle.addEventListener('change', () => {
	applyClockLayout(secondsToggle.checked);
	updateClock();
});

applyClockLayout(secondsToggle.checked);

syncClockWithNetwork().finally(() => {
	updateClock();
	startClockTicker();
});

setInterval(syncClockWithNetwork, NETWORK_RESYNC_INTERVAL_MS);
