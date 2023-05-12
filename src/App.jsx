import { useEffect, useRef } from "react";
import * as faceapi from "face-api.js";

function App() {
	const videoInputRef = useRef(null);
	const canvasRef = useRef(null);

	function loadModels() {
		Promise.all([
			faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
			faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models"),
			faceapi.nets.ageGenderNet.loadFromUri("/models"),
			faceapi.nets.faceExpressionNet.loadFromUri("/models"),
		]).then(() => {
			console.log("Models loaded");
		});
	}

	async function getCameraStream() {
		let stream = null;

		try {
			stream = await navigator.mediaDevices.getUserMedia({ video: true });
		} catch (error) {
			console.error(error);
		}

		return stream;
	}

	async function detectFacesFromInput(input) {
		const detections = await faceapi
			.detectAllFaces(input, new faceapi.TinyFaceDetectorOptions())
			.withFaceLandmarks(true)
			.withFaceExpressions()
			.withAgeAndGender();

		return detections;
	}

	useEffect(() => {
		loadModels();
		getCameraStream().then((stream) => {
			videoInputRef.current.srcObject = stream;
		});

		const interval = setInterval(
			() =>
				detectFacesFromInput(videoInputRef.current).then((detections) => {
					const displaySize = {
						width: videoInputRef.current.videoWidth,
						height: videoInputRef.current.videoHeight,
					};

					faceapi.matchDimensions(canvasRef.current, displaySize);

					const resizedDetections = faceapi.resizeResults(
						detections,
						displaySize,
					);

					faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
					faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
					faceapi.draw.drawFaceExpressions(
						canvasRef.current,
						resizedDetections,
					);
				}),
			500,
		);

		return () => {
			clearInterval(interval);
		};
	}, []);

	return (
		<div className="h-full flex flex-col items-center justify-center gap-8">
			<h1 className="text-2xl font-bold">Nhận diện khuôn mặt</h1>
			<div className="bg-gray-900 p-4 mx-4 rounded-md border border-gray-800">
				<div className="relative w-fit">
					<video
						ref={videoInputRef}
						autoPlay
						className="rounded shadow-inner"
					></video>
					<canvas ref={canvasRef} className="w-full absolute inset-0"></canvas>
				</div>
			</div>
		</div>
	);
}

export default App;
