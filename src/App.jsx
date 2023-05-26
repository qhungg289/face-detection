import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { Toaster, toast } from "sonner";
import Spinner from "./components/Spinner";
import {
	translatedExpressionsName,
	loadModels,
	getCameraStream,
	detectFacesFromInput,
} from "./utils";

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
					`Cảm xúc: ${translatedExpressionsName.get(
						d.expressions.asSortedArray()[0].expression,
					)}`,
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
			const expression = translatedExpressionsName.get(
				d.expressions.asSortedArray()[0].expression,
			);

			text.push(
				`Bạn ${gender}, ${age} tuổi, đang cảm thấy ${expression.toLowerCase()}`,
			);
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
			if (!speechSynthesis.speaking && textToSpeech) {
				const msg = new SpeechSynthesisUtterance();
				msg.text = textToSpeech;
				msg.lang = "vi";
				speechSynthesis.speak(msg);
				setTextToSpeech("");
			}
		}, 0);

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
