import { useEffect, useRef } from "react";
import * as faceapi from "face-api.js";

// https://translate.google.com.vn/translate_tts?ie=UTF-8&q=xin+ch%C3%A0o&tl=vi&client=tw-ob

const modelsPath = "/models";
const translatedExpressionsName = {
	neutral: "Bình thường",
	surprised: "Ngạc nhiên",
	happy: "Hạnh phúc",
	angry: "Tức giận",
	disgusted: "Kinh tởm",
	sad: "Buồn bã",
	fearful: "Sợ hãi",
};

function App() {
	const videoInputRef = useRef(null);
	const canvasRef = useRef(null);

	function loadModels() {
		Promise.all([
			faceapi.nets.tinyFaceDetector.loadFromUri(modelsPath),
			faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelsPath),
			faceapi.nets.ageGenderNet.loadFromUri(modelsPath),
			faceapi.nets.faceExpressionNet.loadFromUri(modelsPath),
		]).then(() => {
			console.log(faceapi.nets);
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

	function drawBoxes(detections) {
		const displaySize = {
			width: videoInputRef.current.videoWidth,
			height: videoInputRef.current.videoHeight,
		};

		faceapi.matchDimensions(canvasRef.current, displaySize);

		const resizedDetections = faceapi.resizeResults(detections, displaySize);

		faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
		faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);

		detections.forEach((d) => {
			const text = new faceapi.draw.DrawTextField(
				[
					`Giới tính: ${d.gender == "male" ? "Nam" : "Nữ"}`,
					`Tuổi: ${Math.round(d.age)}`,
					`Cảm xúc: ${
						translatedExpressionsName[
							d.expressions.asSortedArray()[0].expression
						]
					}`,
				],
				{ x: d.detection.box.right, y: d.detection.box.y },
				{ anchorPosition: "BOTTOM_RIGHT" },
			);
			text.draw(canvasRef.current);
		});
	}

	useEffect(() => {
		if (!videoInputRef.current) {
			return;
		}

		loadModels();

		getCameraStream().then((stream) => {
			videoInputRef.current.srcObject = stream;
		});

		const interval = setInterval(() => {
			detectFacesFromInput(videoInputRef.current).then((detections) => {
				drawBoxes(detections);
			});
		}, 1000);

		return () => {
			clearInterval(interval);
		};
	}, []);

	return (
		<div className="h-full flex flex-col items-center justify-center gap-8">
			<div className="mx-4">
				<div className="flex flex-col items-center gap-4 bg-white p-4 border border-gray-200 rounded-xl relative shadow-lg">
					<div className="relative w-fit">
						<video
							ref={videoInputRef}
							autoPlay
							className="rounded-lg shadow-lg"
						></video>
						<canvas
							ref={canvasRef}
							className="w-full absolute inset-0"
						></canvas>
					</div>
					<p className="text-lg text-gray-500">Nhận diện khuôn mặt</p>
				</div>
			</div>
		</div>
	);
}

export default App;
