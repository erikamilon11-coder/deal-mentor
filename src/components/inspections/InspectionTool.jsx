import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Camera,
  Trash2,
  Download,
  Plus,
  X,
  Loader2,
  AlertCircle,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

export default function InspectionTool({ leadId, lead, propertyData }) {
  const queryClient = useQueryClient();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [showCamera, setShowCamera] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [notes, setNotes] = useState("");
  const [estimatedRepairs, setEstimatedRepairs] = useState(
    propertyData?.estimated_repairs || ""
  );
  const [cameraActive, setCameraActive] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(null);

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error) {
      toast.error("Unable to access camera. Please check permissions.");
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      setCameraActive(false);
      setShowCamera(false);
    }
  };

  // Capture photo
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);

      const photoData = canvasRef.current.toDataURL("image/jpeg");
      setPhotos((prev) => [
        ...prev,
        {
          id: Date.now(),
          data: photoData,
          timestamp: new Date().toLocaleString(),
        },
      ]);
      toast.success("Photo captured!");
    }
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotos((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            data: event.target.result,
            timestamp: new Date().toLocaleString(),
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove photo
  const removePhoto = (photoId) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  // Generate inspection report
  const generateReportMutation = useMutation({
    mutationFn: async () => {
      if (photos.length === 0) {
        throw new Error("Please capture at least one photo");
      }

      const response = await base44.functions.invoke("generateInspectionReport", {
        lead_id: leadId,
        photos: photos.map((p) => p.data),
        notes,
        estimated_repairs: estimatedRepairs ? parseFloat(estimatedRepairs) : null,
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success("Inspection report generated!");
      // Download PDF
      if (data.pdf_data) {
        const link = document.createElement("a");
        link.href = data.pdf_data;
        link.download = `inspection_report_${lead.property_address?.replace(/\s+/g, "_")}.pdf`;
        link.click();
      }
      // Update property data
      queryClient.invalidateQueries({ queryKey: ["propertyData", leadId] });
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });

      // Reset form
      setPhotos([]);
      setNotes("");
      setEstimatedRepairs("");
    },
    onError: (error) => toast.error(error.message || "Failed to generate report"),
  });

  const hasData = photos.length > 0 || notes.trim();

  return (
    <div className="space-y-4">
      {/* Camera View */}
      {showCamera && cameraActive ? (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full"
                style={{ maxHeight: "400px", objectFit: "cover" }}
              />
              <canvas ref={canvasRef} className="hidden" />

              <div className="absolute bottom-4 left-0 right-0 flex gap-2 px-4">
                <Button
                  onClick={capturePhoto}
                  size="lg"
                  className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Camera className="w-5 h-5" />
                  Capture Photo
                </Button>
                <Button
                  onClick={stopCamera}
                  variant="outline"
                  size="lg"
                  className="gap-2"
                >
                  <X className="w-5 h-5" />
                  Close
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Inspection Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Property Inspection
              </CardTitle>
              <p className="text-sm text-slate-600 mt-2">
                {lead?.property_address}
              </p>
            </CardHeader>
          </Card>

          {/* Photo Gallery */}
          {photos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Photos ({photos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {photos.map((photo, idx) => (
                    <div
                      key={photo.id}
                      className="relative group rounded-lg overflow-hidden bg-slate-100"
                    >
                      <img
                        src={photo.data}
                        alt={`Inspection photo ${idx + 1}`}
                        className="w-full aspect-square object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-white hover:bg-red-600"
                          onClick={() => removePhoto(photo.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-white hover:bg-blue-600"
                          onClick={() => setActivePhotoIndex(idx)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="absolute bottom-1 left-1 right-1 text-xs text-white bg-black/50 px-2 py-1 rounded truncate">
                        {photo.timestamp}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Camera & Upload Controls */}
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setShowCamera(true);
                startCamera();
              }}
              variant="outline"
              className="flex-1 gap-2"
            >
              <Camera className="w-4 h-4" />
              Take Photo
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="flex-1 gap-2"
            >
              <Plus className="w-4 h-4" />
              Upload Photo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Notes & Repairs Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inspection Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  placeholder="Document any issues, observations, or repairs needed..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Estimated Repair Costs
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={estimatedRepairs}
                  onChange={(e) => setEstimatedRepairs(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-blue-900">
                  {photos.length === 0
                    ? "Capture at least one photo to generate the inspection report"
                    : `Ready to generate report with ${photos.length} photo${
                        photos.length === 1 ? "" : "s"
                      }`}
                </p>
              </div>

              <Button
                onClick={() => generateReportMutation.mutate()}
                disabled={
                  photos.length === 0 ||
                  generateReportMutation.isPending
                }
                className="w-full gap-2"
              >
                {generateReportMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Generate & Download Report
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}