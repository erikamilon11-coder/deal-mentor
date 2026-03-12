import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Eye,
  Plus,
  X,
  Loader2,
  File,
  Image as ImageIcon
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

const DOCUMENT_TYPES = [
  "Contract",
  "Title Deed",
  "Inspection Report",
  "Appraisal",
  "Survey",
  "Photo",
  "Other"
];

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getFileIcon = (fileName) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
    return <ImageIcon className="w-5 h-5 text-blue-600" />;
  }
  if (ext === 'pdf') {
    return <FileText className="w-5 h-5 text-red-600" />;
  }
  return <File className="w-5 h-5 text-slate-600" />;
};

export default function DocumentManager({ leadId }) {
  const [showUpload, setShowUpload] = useState(false);
  const [uploadData, setUploadData] = useState({
    document_name: "",
    document_type: "Other",
    notes: "",
    file: null
  });
  const [isUploading, setIsUploading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);

  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', leadId],
    queryFn: () => base44.entities.Document.filter({ lead_id: leadId }, '-upload_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', leadId] });
    }
  });

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadData(prev => ({
        ...prev,
        file,
        document_name: prev.document_name || file.name
      }));
    }
  };

  const handleUpload = async () => {
    if (!uploadData.file) return;

    setIsUploading(true);
    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({
        file: uploadData.file
      });

      // Create document record
      await base44.entities.Document.create({
        lead_id: leadId,
        document_name: uploadData.document_name,
        document_type: uploadData.document_type,
        file_url: file_url,
        file_size: uploadData.file.size,
        upload_date: new Date().toISOString(),
        notes: uploadData.notes
      });

      queryClient.invalidateQueries({ queryKey: ['documents', leadId] });
      
      // Reset form
      setUploadData({
        document_name: "",
        document_type: "Other",
        notes: "",
        file: null
      });
      setShowUpload(false);
    } catch (error) {
      alert('Upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleView = (doc) => {
    setViewingDoc(doc);
  };

  const handleDownload = (doc) => {
    window.open(doc.file_url, '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Documents
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {documents.length} file{documents.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowUpload(!showUpload)}
          className="text-slate-600"
        >
          {showUpload ? (
            <>
              <X className="w-4 h-4 mr-1" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-1" />
              Upload
            </>
          )}
        </Button>
      </div>

      {showUpload && (
        <Card className="p-4 bg-slate-50">
          <div className="space-y-3">
            <div>
              <Label className="text-slate-700 text-sm">Choose File</Label>
              <div className="mt-1.5">
                <label className="block">
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-slate-400 transition-colors">
                    {uploadData.file ? (
                      <div className="flex items-center justify-center gap-2">
                        {getFileIcon(uploadData.file.name)}
                        <span className="text-sm text-slate-700 font-medium">
                          {uploadData.file.name}
                        </span>
                        <span className="text-xs text-slate-500">
                          ({formatFileSize(uploadData.file.size)})
                        </span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-600">Click to select file</p>
                        <p className="text-xs text-slate-500 mt-1">PDF, Images, or Documents</p>
                      </>
                    )}
                  </div>
                  <Input
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                  />
                </label>
              </div>
            </div>

            <div>
              <Label className="text-slate-700 text-sm">Document Name</Label>
              <Input
                value={uploadData.document_name}
                onChange={(e) => setUploadData({ ...uploadData, document_name: e.target.value })}
                placeholder="e.g., Purchase Agreement"
                className="mt-1.5 h-10 rounded-lg"
              />
            </div>

            <div>
              <Label className="text-slate-700 text-sm">Document Type</Label>
              <Select
                value={uploadData.document_type}
                onValueChange={(value) => setUploadData({ ...uploadData, document_type: value })}
              >
                <SelectTrigger className="mt-1.5 h-10 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-700 text-sm">Notes (optional)</Label>
              <Textarea
                value={uploadData.notes}
                onChange={(e) => setUploadData({ ...uploadData, notes: e.target.value })}
                placeholder="Add notes about this document..."
                className="mt-1.5 rounded-lg"
                rows={2}
              />
            </div>

            <Button
              onClick={handleUpload}
              disabled={!uploadData.file || !uploadData.document_name || isUploading}
              className="w-full h-10 rounded-lg bg-slate-900"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {documents.length === 0 && !showUpload && (
        <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No documents uploaded yet</p>
        </div>
      )}

      <div className="space-y-2">
        {documents.map((doc) => (
          <Card key={doc.id} className="p-3 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {getFileIcon(doc.document_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-900 truncate">
                      {doc.document_name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs bg-slate-50">
                        {doc.document_type}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {formatFileSize(doc.file_size)}
                      </span>
                      <span className="text-xs text-slate-500">
                        • {format(new Date(doc.upload_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                    {doc.notes && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                        {doc.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleView(doc)}
                  className="h-8 w-8"
                  title="View"
                >
                  <Eye className="w-4 h-4 text-slate-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDownload(doc)}
                  className="h-8 w-8"
                  title="Download"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm('Delete this document?')) {
                      deleteMutation.mutate(doc.id);
                    }
                  }}
                  className="h-8 w-8"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {viewingDoc && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setViewingDoc(null)}
        >
          <div 
            className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-semibold text-slate-900">{viewingDoc.document_name}</h3>
                <p className="text-sm text-slate-500">{viewingDoc.document_type}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(viewingDoc)}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewingDoc(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {viewingDoc.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <img 
                  src={viewingDoc.file_url} 
                  alt={viewingDoc.document_name}
                  className="max-w-full h-auto mx-auto"
                />
              ) : viewingDoc.file_url.endsWith('.pdf') ? (
                <iframe
                  src={viewingDoc.file_url}
                  className="w-full h-[600px] rounded-lg"
                  title={viewingDoc.document_name}
                />
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 mb-4">Preview not available for this file type</p>
                  <Button onClick={() => handleDownload(viewingDoc)}>
                    <Download className="w-4 h-4 mr-2" />
                    Download to View
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}