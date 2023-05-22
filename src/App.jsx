import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { Toaster, toast } from "sonner";
import Spinner from "./components/Spinner";

// https://translate.google.com.vn/translate_tts?ie=UTF-8&q=xin+ch%C3%A0o&tl=vi&client=tw-ob

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

		const interval = setInterval(() => {
			detectFacesFromInput(videoInputRef.current)
				.then((detections) => {
					drawDetectionBoxes(detections);
					drawTextBoxes(detections);
				})
				.catch((e) => {
					setErrors(e.message);
				});
		}, 1000);

		return () => {
			clearInterval(interval);
		};
	}, []);

	useEffect(() => {
		if (errors) {
			toast.error(errors);
		}
	}, [errors]);

	return (
		<>
			<Toaster richColors />
			<div className="h-full flex flex-col items-center justify-center">
				<div className="flex flex-col items-center gap-4 bg-white p-4 mx-4 border border-gray-200 rounded-xl relative shadow-lg">
					<div className="relative w-fit">
						<video
							ref={videoInputRef}
							autoPlay
							className={`${
								isLoading ? "hidden" : "block"
							} rounded-lg shadow-inner bg-white border border-gray-200`}
						></video>
						<canvas
							ref={canvasRef}
							className={`${
								isLoading ? "hidden" : "block"
							} w-full absolute inset-0`}
						></canvas>
						{isLoading && (
							<div className="rounded-lg shadow-inner bg-gray-200 border border-gray-200 aspect-[4/3] w-72 md:w-[40rem] animate-pulse flex flex-col items-center justify-center gap-4 text-gray-500">
								<Spinner />
								<p>Đang chuẩn bị...</p>
							</div>
						)}
					</div>
					<p className="text-gray-500 font-medium bg-gray-100 shadow-inner px-4 py-1 rounded-full">
						Nhận diện khuôn mặt
					</p>
				</div>
			</div>
		</>
	);
}

export default App;
