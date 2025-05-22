export interface FaceInfo {
  age?: string;
  faceShape?: string;
  skinTone?: string;
  skinColor?: string;
  gender?: string;
}

export interface FaceAnalyzerProps {
  callback: (info: FaceInfo) => void;
}
