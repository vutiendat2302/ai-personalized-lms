import { useEffect, useState } from "react";
import axios from "axios";
import {
  adminCourseClassApi,
  type StreamPostComment,
  type StreamPostItem,
  type StreamPostType,
} from "@/api/courses/adminCourseClassApi";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Edit3, Loader2, Lock, MessageCircle, MessageSquare, Pin, Send, Trash2 } from "lucide-react";

interface ClassroomStreamTabProps {
  classId: string;
  className: string;
  currentUserName?: string;
  currentUserRole?: "TEACHER" | "STUDENT" | "ADMIN";
}

interface CommentPageState {
  rows: StreamPostComment[];
  loading: boolean;
  loaded: boolean;
  error: string;
}

/** Đổi loại bài thành nhãn ngắn gọn cho thành viên lớp. */
const typeLabel = (type: StreamPostType) => ({
  QUESTION: "Câu hỏi",
  DISCUSSION: "Thảo luận",
  ANNOUNCEMENT: "Thông báo",
})[type];

/** Hiển thị thời gian bài đăng hoặc bình luận theo múi giờ trình duyệt. */
const formatDateTime = (value: string) => new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
}).format(new Date(value));

/** Ưu tiên thông báo nghiệp vụ backend và dùng fallback khi lỗi mạng. */
const axiosErrorMessage = (requestError: unknown, fallback: string) => axios.isAxiosError(requestError)
  ? String(requestError.response?.data?.message || fallback)
  : fallback;

/** Khu vực thảo luận/hỏi đáp dùng chung cho học viên, giáo viên và quản trị lớp. */
export const ClassroomStreamTab = ({
  classId,
  className,
  currentUserName = "Thành viên lớp",
  currentUserRole = "TEACHER",
}: ClassroomStreamTabProps) => {
  const { auth } = useAuth();
  const { success, error: showError } = useToast();
  const canModerate = currentUserRole !== "STUDENT";
  const currentUserId = String(auth.user?.id || "");
  const [posts, setPosts] = useState<StreamPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showComposer, setShowComposer] = useState(false);
  const [postType, setPostType] = useState<StreamPostType>("DISCUSSION");
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busyPostId, setBusyPostId] = useState("");
  const [comments, setComments] = useState<Record<string, CommentPageState>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentBusyPostId, setCommentBusyPostId] = useState("");
  const [editingPost, setEditingPost] = useState<StreamPostItem | null>(null);
  const [editingPostTitle, setEditingPostTitle] = useState("");
  const [editingPostContent, setEditingPostContent] = useState("");
  const [editingCommentId, setEditingCommentId] = useState("");
  const [editingCommentContent, setEditingCommentContent] = useState("");

  /** Tải một trang bài đăng và giữ riêng loading/error/empty state. */
  const loadPosts = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const result = await adminCourseClassApi.getStreamPosts(classId, page, 10);
      setPosts(result?.content || []);
      setTotalPages(Math.max(1, Number(result?.totalPages || 1)));
    } catch (requestError) {
      setPosts([]);
      setLoadError(axiosErrorMessage(requestError, "Không thể tải bài đăng trong lớp."));
    } finally {
      setLoading(false);
    }
  };

  /** Tải lại feed khi đổi lớp hoặc trang. */
  useEffect(() => {
    void loadPosts();
  }, [classId, page]);

  /** Tạo bài theo loại được phép và ngăn gửi request trùng. */
  const createPost = async () => {
    if (!postContent.trim() || submitting) return;
    setSubmitting(true);
    try {
      await adminCourseClassApi.createStreamPost(classId, {
        type: postType,
        title: postTitle.trim() || undefined,
        content: postContent.trim(),
      });
      setPostTitle("");
      setPostContent("");
      setPostType("DISCUSSION");
      setShowComposer(false);
      setPage(0);
      await loadPosts();
      success("Đã đăng bài trong lớp.");
    } catch (requestError) {
      showError(axiosErrorMessage(requestError, "Không thể đăng bài."));
    } finally {
      setSubmitting(false);
    }
  };

  /** Mở dialog sửa với nội dung hiện tại của bài. */
  const openEditPost = (post: StreamPostItem) => {
    setEditingPost(post);
    setEditingPostTitle(post.title || "");
    setEditingPostContent(post.content);
  };

  /** Lưu nội dung bài đã sửa qua API quyền sở hữu. */
  const savePost = async () => {
    if (!editingPost || !editingPostContent.trim() || busyPostId) return;
    setBusyPostId(editingPost.id);
    try {
      const updated = await adminCourseClassApi.updateStreamPost(classId, editingPost.id, {
        title: editingPostTitle.trim() || undefined,
        content: editingPostContent.trim(),
      });
      setPosts((rows) => rows.map((row) => row.id === updated.id ? updated : row));
      setEditingPost(null);
      success("Đã cập nhật bài đăng.");
    } catch (requestError) {
      showError(axiosErrorMessage(requestError, "Không thể cập nhật bài đăng."));
    } finally {
      setBusyPostId("");
    }
  };

  /** Xóa bài theo quyền tác giả hoặc staff và cập nhật feed ngay. */
  const deletePost = async (postId: string) => {
    if (busyPostId) return;
    setBusyPostId(postId);
    try {
      await adminCourseClassApi.deleteStreamPost(classId, postId);
      setPosts((rows) => rows.filter((row) => row.id !== postId));
      success("Đã xóa bài đăng.");
    } catch (requestError) {
      showError(axiosErrorMessage(requestError, "Không thể xóa bài đăng."));
    } finally {
      setBusyPostId("");
    }
  };

  /** Đổi trạng thái ghim hoặc khóa bình luận của một bài. */
  const moderatePost = async (post: StreamPostItem, payload: { pinned?: boolean; commentLocked?: boolean }) => {
    if (busyPostId) return;
    setBusyPostId(post.id);
    try {
      const updated = await adminCourseClassApi.moderateStreamPost(classId, post.id, payload);
      setPosts((rows) => rows.map((row) => row.id === updated.id ? updated : row));
    } catch (requestError) {
      showError(axiosErrorMessage(requestError, "Không thể cập nhật trạng thái bài đăng."));
    } finally {
      setBusyPostId("");
    }
  };

  /** Tải bình luận lần đầu khi thành viên mở một bài. */
  const toggleComments = async (postId: string) => {
    if (comments[postId]?.loaded) {
      setComments((state) => {
        const copy = { ...state };
        delete copy[postId];
        return copy;
      });
      return;
    }
    setComments((state) => ({ ...state, [postId]: { rows: [], loading: true, loaded: false, error: "" } }));
    try {
      const result = await adminCourseClassApi.getStreamComments(classId, postId);
      setComments((state) => ({ ...state, [postId]: { rows: result?.content || [], loading: false, loaded: true, error: "" } }));
    } catch (requestError) {
      setComments((state) => ({ ...state, [postId]: { rows: [], loading: false, loaded: true, error: axiosErrorMessage(requestError, "Không thể tải bình luận.") } }));
    }
  };

  /** Đăng bình luận mới và chèn ngay vào danh sách đang mở. */
  const createComment = async (post: StreamPostItem) => {
    const content = commentDrafts[post.id]?.trim();
    if (!content || commentBusyPostId) return;
    setCommentBusyPostId(post.id);
    try {
      const created = await adminCourseClassApi.createStreamComment(classId, post.id, content);
      setComments((state) => ({
        ...state,
        [post.id]: { rows: [...(state[post.id]?.rows || []), created], loading: false, loaded: true, error: "" },
      }));
      setPosts((rows) => rows.map((row) => row.id === post.id ? { ...row, commentCount: row.commentCount + 1 } : row));
      setCommentDrafts((drafts) => ({ ...drafts, [post.id]: "" }));
    } catch (requestError) {
      showError(axiosErrorMessage(requestError, "Không thể đăng bình luận."));
    } finally {
      setCommentBusyPostId("");
    }
  };

  /** Bắt đầu sửa một bình luận của người dùng hiện tại. */
  const openEditComment = (comment: StreamPostComment) => {
    setEditingCommentId(comment.id);
    setEditingCommentContent(comment.content);
  };

  /** Lưu bình luận đang sửa và cập nhật đúng bài chứa nó. */
  const saveComment = async (postId: string) => {
    if (!editingCommentId || !editingCommentContent.trim() || commentBusyPostId) return;
    setCommentBusyPostId(postId);
    try {
      const updated = await adminCourseClassApi.updateStreamComment(
        classId, postId, editingCommentId, editingCommentContent.trim(),
      );
      setComments((state) => ({
        ...state,
        [postId]: { ...state[postId], rows: state[postId].rows.map((row) => row.id === updated.id ? updated : row) },
      }));
      setEditingCommentId("");
      setEditingCommentContent("");
    } catch (requestError) {
      showError(axiosErrorMessage(requestError, "Không thể cập nhật bình luận."));
    } finally {
      setCommentBusyPostId("");
    }
  };

  /** Xóa bình luận theo quyền backend và giảm bộ đếm trên bài. */
  const deleteComment = async (postId: string, commentId: string) => {
    if (commentBusyPostId) return;
    setCommentBusyPostId(postId);
    try {
      await adminCourseClassApi.deleteStreamComment(classId, postId, commentId);
      setComments((state) => ({
        ...state,
        [postId]: { ...state[postId], rows: state[postId].rows.filter((row) => row.id !== commentId) },
      }));
      setPosts((rows) => rows.map((row) => row.id === postId ? { ...row, commentCount: Math.max(0, row.commentCount - 1) } : row));
    } catch (requestError) {
      showError(axiosErrorMessage(requestError, "Không thể xóa bình luận."));
    } finally {
      setCommentBusyPostId("");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Card className="overflow-hidden border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary" /><Badge>Thảo luận và hỏi đáp</Badge></div>
          <h2 className="mt-3 text-xl font-bold">{className}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Đặt câu hỏi, trao đổi bài học và theo dõi thông báo của lớp.</p>
        </CardContent>
      </Card>

      {!showComposer ? (
        <Button variant="outline" className="h-12 w-full justify-start" onClick={() => setShowComposer(true)}>
          <MessageSquare className="mr-2 h-4 w-4" />{currentUserName}, bạn muốn trao đổi điều gì?
        </Button>
      ) : (
        <Card><CardContent className="space-y-3 p-5">
          <Select value={postType} onValueChange={(value) => setPostType(value as StreamPostType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="QUESTION">Câu hỏi</SelectItem>
              <SelectItem value="DISCUSSION">Thảo luận</SelectItem>
              {canModerate && <SelectItem value="ANNOUNCEMENT">Thông báo</SelectItem>}
            </SelectContent>
          </Select>
          <Input value={postTitle} onChange={(event) => setPostTitle(event.target.value)} placeholder="Tiêu đề (không bắt buộc)" />
          <Textarea value={postContent} onChange={(event) => setPostContent(event.target.value)} placeholder="Nội dung bài đăng" rows={4} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowComposer(false)} disabled={submitting}>Hủy</Button>
            <Button onClick={() => void createPost()} disabled={!postContent.trim() || submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{submitting ? "Đang đăng..." : "Đăng bài"}
            </Button>
          </div>
        </CardContent></Card>
      )}

      {loading ? (
        <div className="space-y-3"><Skeleton className="h-44" /><Skeleton className="h-44" /></div>
      ) : loadError ? (
        <Card className="border-destructive/30"><CardContent className="space-y-3 p-8 text-center text-sm text-destructive"><p>{loadError}</p><Button variant="outline" onClick={() => void loadPosts()}>Thử lại</Button></CardContent></Card>
      ) : posts.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-10 text-center"><MessageSquare className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" /><p className="font-semibold">Chưa có bài đăng</p><p className="mt-1 text-sm text-muted-foreground">Hãy bắt đầu câu hỏi hoặc cuộc thảo luận đầu tiên.</p></CardContent></Card>
      ) : posts.map((post) => {
        const ownPost = post.authorId === currentUserId;
        const commentState = comments[post.id];
        return (
          <Card key={post.id} className={post.pinned ? "border-primary/40" : ""}>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">{post.authorName.slice(0, 2).toUpperCase()}</div>
                  <div><p className="font-semibold">{post.authorName}</p><p className="text-xs text-muted-foreground">{formatDateTime(post.createdAt)}</p></div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1">
                  <Badge variant="secondary">{typeLabel(post.type)}</Badge>
                  {post.pinned && <Badge variant="outline"><Pin className="mr-1 h-3 w-3" />Đã ghim</Badge>}
                  {post.commentLocked && <Badge variant="outline"><Lock className="mr-1 h-3 w-3" />Đã khóa</Badge>}
                </div>
              </div>
              {post.title && <h3 className="text-lg font-bold">{post.title}</h3>}
              <p className="whitespace-pre-line text-sm leading-6 text-foreground/90">{post.content}</p>
              <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                <Button variant="ghost" size="sm" onClick={() => void toggleComments(post.id)}><MessageCircle className="mr-1 h-4 w-4" />{post.commentCount} bình luận</Button>
                {ownPost && <Button variant="ghost" size="sm" onClick={() => openEditPost(post)}><Edit3 className="mr-1 h-4 w-4" />Sửa</Button>}
                {(ownPost || canModerate) && <Button variant="ghost" size="sm" className="text-destructive" disabled={busyPostId === post.id} onClick={() => void deletePost(post.id)}><Trash2 className="mr-1 h-4 w-4" />Xóa</Button>}
                {canModerate && <>
                  <Button variant="ghost" size="sm" disabled={busyPostId === post.id} onClick={() => void moderatePost(post, { pinned: !post.pinned })}><Pin className="mr-1 h-4 w-4" />{post.pinned ? "Bỏ ghim" : "Ghim"}</Button>
                  <Button variant="ghost" size="sm" disabled={busyPostId === post.id} onClick={() => void moderatePost(post, { commentLocked: !post.commentLocked })}><Lock className="mr-1 h-4 w-4" />{post.commentLocked ? "Mở bình luận" : "Khóa bình luận"}</Button>
                </>}
              </div>

              {commentState && <div className="space-y-3 rounded-xl bg-muted/30 p-4">
                {commentState.loading ? <div className="space-y-2"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
                  : commentState.error ? <p className="text-sm text-destructive">{commentState.error}</p>
                  : commentState.rows.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có bình luận.</p>
                  : commentState.rows.map((comment) => {
                    const ownComment = comment.authorId === currentUserId;
                    return <div key={comment.id} className="rounded-lg border bg-background p-3">
                      <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{comment.authorName}</p><p className="text-xs text-muted-foreground">{formatDateTime(comment.createdAt)}</p></div>
                      {editingCommentId === comment.id ? <div className="mt-2 space-y-2"><Textarea value={editingCommentContent} onChange={(event) => setEditingCommentContent(event.target.value)} /><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setEditingCommentId("")}>Hủy</Button><Button size="sm" onClick={() => void saveComment(post.id)} disabled={!editingCommentContent.trim() || commentBusyPostId === post.id}>Lưu</Button></div></div>
                        : <><p className="mt-2 whitespace-pre-line text-sm">{comment.content}</p><div className="mt-2 flex gap-1">{ownComment && <Button size="sm" variant="ghost" onClick={() => openEditComment(comment)}>Sửa</Button>}{(ownComment || canModerate) && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void deleteComment(post.id, comment.id)} disabled={commentBusyPostId === post.id}>Xóa</Button>}</div></>}
                    </div>;
                  })}
                {!post.commentLocked && <div className="flex gap-2"><Input value={commentDrafts[post.id] || ""} onChange={(event) => setCommentDrafts((drafts) => ({ ...drafts, [post.id]: event.target.value }))} placeholder="Viết bình luận hoặc câu trả lời..." disabled={commentBusyPostId === post.id} /><Button size="icon" onClick={() => void createComment(post)} disabled={!commentDrafts[post.id]?.trim() || commentBusyPostId === post.id}>{commentBusyPostId === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button></div>}
              </div>}
            </CardContent>
          </Card>
        );
      })}

      {!loading && !loadError && totalPages > 1 && <div className="flex items-center justify-center gap-3"><Button size="icon" variant="outline" disabled={page === 0} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="h-4 w-4" /></Button><span className="text-sm">Trang {page + 1}/{totalPages}</span><Button size="icon" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage((value) => value + 1)}><ChevronRight className="h-4 w-4" /></Button></div>}

      <Dialog open={Boolean(editingPost)} onOpenChange={(open) => !open && setEditingPost(null)}>
        <DialogContent><DialogHeader><DialogTitle>Sửa bài đăng</DialogTitle></DialogHeader><div className="space-y-3"><Input value={editingPostTitle} onChange={(event) => setEditingPostTitle(event.target.value)} placeholder="Tiêu đề" /><Textarea value={editingPostContent} onChange={(event) => setEditingPostContent(event.target.value)} rows={5} /></div><DialogFooter><Button variant="outline" onClick={() => setEditingPost(null)}>Hủy</Button><Button onClick={() => void savePost()} disabled={!editingPostContent.trim() || Boolean(busyPostId)}>{busyPostId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Lưu thay đổi</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
};
