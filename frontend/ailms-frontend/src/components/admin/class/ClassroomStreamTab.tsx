import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Send,
  Paperclip,
  Loader2,
  Trash2,
  FileText,
  Calendar,
  Eye,
  Download,
} from "lucide-react";
import { adminCourseClassApi } from "@/api/courses/adminCourseClassApi";
import httpClient from "@/api/httpClient";
import { fileAdminApi } from "@/api/file/fileAdminApi";

export interface StreamPost {
  id: string;
  authorUserId: string;
  authorName: string;
  authorAvatar?: string;
  title?: string;
  content: string;
  fileKey?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  fileUrl?: string;
  createdAt: string;
}

interface ClassroomStreamTabProps {
  classId: string;
  className: string;
  currentUserName?: string;
  currentUserRole?: "TEACHER" | "STUDENT" | "ADMIN";
}

export const ClassroomStreamTab: React.FC<ClassroomStreamTabProps> = ({
  classId,
  className,
  currentUserName = "Giảng viên / Quản trị viên",
}) => {
  const [posts, setPosts] = useState<StreamPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showComposer, setShowComposer] = useState(false);

  // New post form state
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [uploadedFile, setUploadedFile] = useState<{
    fileKey: string;
    fileName: string;
    fileType?: string;
    fileSize?: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (classId) {
      fetchPosts();
    }
  }, [classId]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await adminCourseClassApi.getStreamPosts(classId, 0, 50);
      if (res && res.content) {
        setPosts(
          res.content.map((p: any) => ({
            id: String(p.id),
            authorUserId: String(p.authorUserId),
            authorName: p.authorName || "Người dùng",
            authorAvatar: p.authorAvatar,
            title: p.title,
            content: p.content,
            fileKey: p.fileKey,
            fileName: p.fileName,
            fileType: p.fileType,
            fileSize: p.fileSize,
            fileUrl: p.fileUrl || (p.fileKey ? `/api/v1/files/download?fileKey=${encodeURIComponent(p.fileKey)}` : undefined),
            createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString("vi-VN") : "Hôm nay",
          }))
        );
      } else {
        setPosts([]);
      }
    } catch (err) {
      console.warn("Could not fetch stream posts:", err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("referenceEntityType", "CLASS_STREAM");

      const res = await httpClient.post("/v1/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const fileData = res.data?.data;
      if (fileData) {
        setUploadedFile({
          fileKey: fileData.fileKey || fileData.key,
          fileName: fileData.originalName || fileData.fileName || file.name,
          fileType: fileData.fileType || file.type,
          fileSize: fileData.fileSize || file.size,
        });
      }
    } catch (err) {
      console.error("File upload error:", err);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;

    setSubmitting(true);
    try {
      await adminCourseClassApi.createStreamPost(classId, {
        title: postTitle.trim() || undefined,
        content: postContent.trim(),
        fileKey: uploadedFile?.fileKey,
        fileName: uploadedFile?.fileName,
        fileType: uploadedFile?.fileType,
        fileSize: uploadedFile?.fileSize,
      });

      setPostTitle("");
      setPostContent("");
      setUploadedFile(null);
      setShowComposer(false);
      await fetchPosts();
    } catch (err) {
      console.error("Could not create stream post:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await adminCourseClassApi.deleteStreamPost(classId, postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error("Could not delete post:", err);
    }
  };

  const canPreviewInBrowser = (fileType?: string, fileName?: string) => {
    const text = `${fileType || ""} ${fileName || ""}`.toLowerCase();
    if (text.match(/\.(doc|docx|xls|xlsx|ppt|pptx|zip|rar|7z)$/)) return false;
    return (
      text.includes("pdf") ||
      text.includes("image") ||
      text.includes("video") ||
      text.includes("audio") ||
      text.includes("text") ||
      text.includes("csv")
    );
  };

  const handleViewFile = async (post: StreamPost) => {
    const { fileKey, fileUrl, fileType, fileName } = post;
    if (!fileKey && !fileUrl) return;
    if (!canPreviewInBrowser(fileType, fileName)) {
      return;
    }

    try {
      const previewUrl = fileKey ? await fileAdminApi.getPreviewUrl(fileKey) : fileUrl;
      if (previewUrl) {
        window.open(previewUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      const fallbackUrl = fileKey
        ? `/api/v1/files/download?fileKey=${encodeURIComponent(fileKey)}`
        : fileUrl;
      if (fallbackUrl) {
        window.open(fallbackUrl, "_blank", "noopener,noreferrer");
      }
    }
  };

  const getDownloadFileName = (contentDisposition?: string, fallback?: string) => {
    const utf8Match = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
    const plainMatch = contentDisposition?.match(/filename="?([^"]+)"?/i);
    return plainMatch?.[1] || fallback || "download";
  };

  const handleDownloadFile = async (post: StreamPost) => {
    if (!post.fileKey) return;
    try {
      const response = await httpClient.get("/v1/files/download", {
        params: { fileKey: post.fileKey },
        responseType: "blob",
      });
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = getDownloadFileName(response.headers["content-disposition"], post.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Could not download post file:", err);
      window.alert("KhÃ´ng thá»ƒ táº£i file, vui lÃ²ng thá»­ láº¡i.");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Stream Welcome Hero Banner */}
      <div className="rounded-3xl bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 p-6">
          <MessageSquare className="h-48 w-48" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-md">
              Google Classroom Stream
            </Badge>
            <span className="text-xs opacity-80">Mã Lớp: #{classId}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Kênh Thảo Luận & Bảng Tin Lớp Học
          </h2>
          <p className="text-xs sm:text-sm opacity-90 max-w-xl">
            Đăng thông báo, trao đổi bài học, đính kèm file tài liệu và thông tin tương tác với học viên và giảng viên.
          </p>
        </div>
      </div>

      {!showComposer && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowComposer(true)}
          className="w-full h-auto justify-start rounded-3xl border-slate-200 bg-white p-4 text-left shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
              {currentUserName.substring(0, 2).toUpperCase()}
            </div>
            <span className="text-sm font-semibold text-slate-500">Viết bài trao đổi với lớp...</span>
          </div>
        </Button>
      )}

      {showComposer && (
      <Card className="border-border shadow-xs rounded-3xl overflow-hidden">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
              {currentUserName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{currentUserName}</p>
              <p className="text-[11px] text-muted-foreground">Đăng bài thông báo tới cả lớp học</p>
            </div>
          </div>

          <form onSubmit={handleCreatePost} className="space-y-3">
            <Input
              placeholder="Tiêu đề bài đăng (Tùy chọn)..."
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              className="text-xs font-semibold rounded-xl bg-slate-50 border-slate-200"
            />
            <Textarea
              placeholder="Thông báo hoặc trao đổi nội dung bài học..."
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              rows={3}
              className="text-xs rounded-xl bg-slate-50 border-slate-200 resize-none"
            />

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Uploaded File Chip */}
            {uploadedFile && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-900 font-medium">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span className="truncate">{uploadedFile.fileName}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setUploadedFile(null)}
                  className="h-6 w-6 p-0 text-red-500 hover:bg-red-100 rounded-lg"
                >
                  ✕
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingFile}
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-slate-700 border-slate-200 rounded-xl gap-1.5"
              >
                {uploadingFile ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                ) : (
                  <Paperclip className="h-3.5 w-3.5 text-indigo-600" />
                )}
                Đính kèm File từ máy tính
              </Button>

              <Button
                type="submit"
                size="sm"
                disabled={submitting || !postContent.trim()}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 cursor-pointer"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Đăng bài
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      )}

      {/* Stream Posts Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" /> Đang tải danh sách bài đăng...
          </div>
        ) : posts.length === 0 ? (
          <Card className="border-dashed border-slate-200 shadow-none">
            <CardContent className="p-8 text-center space-y-2">
              <MessageSquare className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Chưa có bài đăng thông báo nào</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Lớp học chưa có bài đăng trao đổi. Bạn hãy đăng thông báo đầu tiên ở khung phía trên!
              </p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className="border-slate-200 shadow-none rounded-3xl">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {post.authorAvatar ? (
                      <img src={post.authorAvatar} alt={post.authorName} className="w-10 h-10 rounded-2xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                        {post.authorName.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-slate-900">{post.authorName}</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {post.createdAt}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePost(post.id)}
                    className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 rounded-xl"
                    title="Xóa bài đăng"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {post.title && (
                  <h3 className="font-bold text-base text-slate-900">{post.title}</h3>
                )}
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{post.content}</p>

                {post.fileKey && (
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    {canPreviewInBrowser(post.fileType, post.fileName) && (
                    <button
                      type="button"
                      onClick={() => handleViewFile(post)}
                      className="inline-flex items-center gap-2 p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                    >
                      <FileText className="h-4 w-4 text-indigo-600" />
                      <span>{post.fileName || "Tài liệu đính kèm"}</span>
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDownloadFile(post)}
                      className="inline-flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>{canPreviewInBrowser(post.fileType, post.fileName) ? "Tải về" : post.fileName || "Tải tài liệu"}</span>
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
