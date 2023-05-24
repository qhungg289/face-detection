import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { Toaster, toast } from "sonner";
import Spinner from "./components/Spinner";

const MODELS_PATH = "/models";

const translatedExpressionsName = {
	neutral: "Bình thường",
	surprised: "Ngạc nhiên",
	happy: "Hạnh phúc",
	angry: "Tức giận",
	disgusted: "Kinh tởm",
	sad: "Buồn bã",
	fearful: "Sợ hãi",
};

async function loadModels() {
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

async function getCameraStream() {
	let stream = null;

	try {
		stream = await navigator.mediaDevices.getUserMedia({ video: true });
	} catch (error) {
		console.error(error.message);
		throw error;
	}

	return stream;
}

async function detectFacesFromInput(input) {
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

function App() {
	const videoInputRef = useRef(null);
	const canvasRef = useRef(null);
	const [isLoading, setIsLoading] = useState(true);
	const [errors, setErrors] = useState(null);
	const [textToSpeech, setTextToSpeech] = useState("");

	function drawDetectionBoxes(detections) {
		const displaySize = {
			width: videoInputRef.current.videoWidth,
			height: videoInputRef.current.videoHeight,
		};

		faceapi.matchDimensions(canvasRef.current, displaySize);

		const resizedDetections = faceapi.resizeResults(detections, displaySize);

		faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
		faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
	}

	function drawTextBoxes(detections) {
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

	function updateTextToSpeech(detections) {
		let text = [];

		detections.forEach((d) => {
			const gender = d.gender == "male" ? "nam" : "nữ";
			const age = Math.round(d.age);
			const expression =
				translatedExpressionsName[d.expressions.asSortedArray()[0].expression];

			text.push(`Bạn ${gender}, ${age} tuổi, đang cảm thấy ${expression}`);
		});

		setTextToSpeech(text.join(". "));
	}

	useEffect(() => {
		(async () => {
			try {
				await loadModels();
				videoInputRef.current.srcObject = await getCameraStream();
				setIsLoading(false);
			} catch (error) {
				console.error(error.message);
				setErrors(error.message);
			}
		})();

		window.addEventListener("dblclick", () => {
			window.close();
		});

		const interval = setInterval(() => {
			detectFacesFromInput(videoInputRef.current)
				.then((detections) => {
					drawDetectionBoxes(detections);
					drawTextBoxes(detections);
					updateTextToSpeech(detections);
				})
				.catch((e) => {
					setErrors(e.message);
				});
		}, 1000);

		return () => {
			clearInterval(interval);
			window.removeEventListener("dblclick", () => {
				window.close();
			});
		};
	}, []);

	useEffect(() => {
		if (errors) {
			toast.error(errors);
		}
	}, [errors]);

	useEffect(() => {
		let interval = null;

		interval = setInterval(() => {
			const msg = new SpeechSynthesisUtterance();
			msg.text = textToSpeech;
			msg.lang = "vi";
			speechSynthesis.speak(msg);
		}, 1000);

		return () => {
			clearInterval(interval);
		};
	}, [textToSpeech]);

	return (
		<>
			<Toaster richColors />
			<div className="h-full grid items-center content-center overflow-hidden">
				<div className="relative">
					<video
						ref={videoInputRef}
						autoPlay
						className={`${isLoading ? "hidden" : "block"} w-full`}
					></video>
					<canvas
						ref={canvasRef}
						className={`${
							isLoading ? "hidden" : "block"
						} absolute inset-0 w-full`}
					></canvas>
					{isLoading && (
						<div className="rounded-lg shadow-inner bg-gray-200 border border-gray-200 w-full h-screen animate-pulse flex flex-col items-center justify-center gap-4 text-gray-500">
							<Spinner />
							<p>Đang chuẩn bị...</p>
						</div>
					)}
				</div>
			</div>
		</>
	);
}

export default App;
