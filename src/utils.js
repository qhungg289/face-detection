import * as faceapi from "face-api.js";

const MODELS_PATH = "/models";

export const translatedExpressionsName = new Map([
	["neutral", "Bình thường"],
	["surprised", "Ngạc nhiên"],
	["happy", "Hạnh phúc"],
	["angry", "Tức giận"],
	["disgusted", "Kinh tởm"],
	["sad", "Buồn bã"],
	["fearful", "Sợ hãi"],
]);

export async function loadModels() {
	try {
		await Promise.all([
			faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_PATH),
			faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_PATH),
			faceapi.nets.ageGenderNet.loadFromUri(MODELS_PATH),
			faceapi.nets.faceExpressionNet.loadFromUri(MODELS_PATH),
		]);
	} catch (error) {
		console.error(error.message);
		throw error;
	}
}

export async function getCameraStream() {
	let stream = null;

	try {
		stream = await navigator.mediaDevices.getUserMedia({ video: true });
	} catch (error) {
		console.error(error.message);
		throw error;
	}

	return stream;
}

export async function detectFacesFromInput(input) {
	let detections = null;

	try {
		detections = await faceapi
			.detectAllFaces(input, new faceapi.TinyFaceDetectorOptions())
			.withFaceLandmarks(true)
			.withFaceExpressions()
			.withAgeAndGender();
	} catch (error) {
		console.error(error.message);
		throw error;
	}

	return detections;
}

export function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
