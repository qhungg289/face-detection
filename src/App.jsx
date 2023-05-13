import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { v4 as uuidv4 } from "uuid";

function App() {
	const videoInputRef = useRef(null);
	const canvasRef = useRef(null);
	const [detections, setDetections] = useState(null);

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

		if (!videoInputRef.current) {
			return;
		}

		getCameraStream().then((stream) => {
			videoInputRef.current.srcObject = stream;
		});

		const interval = setInterval(
			() =>
				detectFacesFromInput(videoInputRef.current).then((detections) => {
					setDetections(detections);

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

			<div className="mx-4 grid lg:grid-cols-2 gap-4">
				<div className="bg-gray-100 p-4 border border-gray-200 rounded-md relative">
					<div className="relative w-fit">
						<video ref={videoInputRef} autoPlay className="rounded"></video>
						<canvas
							ref={canvasRef}
							className="w-full absolute inset-0"
						></canvas>
					</div>

					{detections == null && (
						<div className="text-center p-4 text-gray-400 bg-gray-200 flex flex-col items-center justify-center gap-2 rounded-b-md absolute bottom-0 inset-x-0 border-t border-gray-300">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="w-8 h-8 animate-spin"
								fill="#9ca3af"
								viewBox="0 0 256 256"
							>
								<path d="M136,32V64a8,8,0,0,1-16,0V32a8,8,0,0,1,16,0Zm88,88H192a8,8,0,0,0,0,16h32a8,8,0,0,0,0-16Zm-45.09,47.6a8,8,0,0,0-11.31,11.31l22.62,22.63a8,8,0,0,0,11.32-11.32ZM128,184a8,8,0,0,0-8,8v32a8,8,0,0,0,16,0V192A8,8,0,0,0,128,184ZM77.09,167.6,54.46,190.22a8,8,0,0,0,11.32,11.32L88.4,178.91A8,8,0,0,0,77.09,167.6ZM72,128a8,8,0,0,0-8-8H32a8,8,0,0,0,0,16H64A8,8,0,0,0,72,128ZM65.78,54.46A8,8,0,0,0,54.46,65.78L77.09,88.4A8,8,0,0,0,88.4,77.09Z"></path>
							</svg>
							<span>Đang chờ quyền truy cập camera...</span>
						</div>
					)}
				</div>

				<div className="bg-gray-100 p-4 border border-gray-200 rounded-md flex flex-col gap-4">
					{detections && (
						<>
							<p className="font-medium">
								Số lượng khuôn mặt:{" "}
								<span className="font-normal">{detections.length}</span>
							</p>
							<ul className="list-disc list-inside">
								{detections.map((d) => (
									<li key={uuidv4()} className="">
										<span>Giới tính: {d.gender == "male" ? "Nam" : "Nữ"}</span>
										<span> | </span>
										<span>Tuổi: {Math.round(d.age)}</span>
									</li>
								))}
							</ul>
						</>
					)}
				</div>
			</div>
		</div>
	);
}

export default App;
