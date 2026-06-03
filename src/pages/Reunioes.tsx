import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Calendar,
  Clock,
  Copy,
  LinkIcon,
  Loader2,
  LogIn,
  Plus,
  Trash2,
  Users,
  Video,
  Check,
  X,
  PhoneOff,
  UserPlus,
  UsersRound,
  PanelRightOpen,
  PanelRightClose,
  Maximize2,
  Minimize2,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useMeetings, type Meeting } from "@/hooks/useMeetings";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { CreateMeetingDialog } from "@/components/reunioes/CreateMeetingDialog";
import { JitsiRoom, type JitsiRoomHandle } from "@/components/reunioes/JitsiRoom";
import { PreJoinScreen } from "@/components/reunioes/PreJoinScreen";
import { InviteUserDialog } from "@/components/reunioes/InviteUserDialog";
import { ManageParticipantsDialog } from "@/components/reunioes/ManageParticipantsDialog";
import { MeetingTranscriber } from "@/components/reunioes/MeetingTranscriber";
import { MeetingSummaryDialog, type MeetingSummary } from "@/components/reunioes/MeetingSummaryDialog";
import { MeetingSnapshotCapture, type MeetingSnapshot } from "@/components/reunioes/MeetingSnapshotCapture";
import { supabase } from "@/integrations/supabase/client";

type Stage = "list" | "prejoin" | "in-call";

function buildShareUrl(roomName: string) {
  return `${window.location.origin}/reunioes?room=${encodeURIComponent(roomName)}`;
}

function MeetingCard({
  meeting,
  canManage,
  canJoin,
  onJoin,
  onCopy,
  onDelete,
  past,
}: {
  meeting: Meeting;
  canManage: boolean;
  canJoin: boolean;
  onJoin: (m: Meeting) => void;
  onCopy: (m: Meeting) => void;
  onDelete: (m: Meeting) => void;
  past?: boolean;
}) {
  const isFinished = meeting.status === "finalizada";
  return (
    <Card className="group transition-all hover:shadow-md">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            <h3 className="truncate font-semibold">{meeting.title}</h3>
            {isFinished ? (
              <Badge variant="secondary">Finalizada</Badge>
            ) : (
              <Badge variant="outline" className="border-primary/30 text-primary">
                {meeting.status === "agendada" ? "Agendada" : meeting.status}
              </Badge>
            )}
            {!canJoin && !isFinished && (
              <Badge variant="secondary" className="gap-1">
                Apenas convidados
              </Badge>
            )}
          </div>
          {meeting.description && (
            <p className="line-clamp-1 text-sm text-muted-foreground">
              {meeting.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(meeting.scheduled_date + "T00:00:00").toLocaleDateString(
                "pt-BR"
              )}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {meeting.start_time.slice(0, 5)}
              {meeting.end_time ? ` – ${meeting.end_time.slice(0, 5)}` : ""}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {meeting.participants.length} convidado(s)
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground/70">
              {meeting.created_by_avatar ? (
                <img 
                  src={meeting.created_by_avatar} 
                  alt={meeting.created_by_name}
                  className="h-4 w-4 rounded-full object-cover"
                />
              ) : (
                <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-[8px] font-bold">{meeting.created_by_name?.charAt(0)}</span>
                </div>
              )}
              por {meeting.created_by_name}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!past && canJoin && (
            <Button size="sm" onClick={() => onJoin(meeting)}>
              <LogIn className="mr-1.5 h-4 w-4" />
              Entrar
            </Button>
          )}
          {canManage && (
            <Button size="sm" variant="outline" onClick={() => onCopy(meeting)}>
              <Copy className="mr-1.5 h-4 w-4" />
              Link
            </Button>
          )}
          {canManage && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onDelete(meeting)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Reunioes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { upcoming, past, isLoading, remove, finish, meetings } = useMeetings();

  const [stage, setStage] = useState<Stage>("list");
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [joinDisplayName, setJoinDisplayName] = useState("");
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmEndForAll, setConfirmEndForAll] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const jitsiRef = useRef<JitsiRoomHandle | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Meeting | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [meetingSummary, setMeetingSummary] = useState<MeetingSummary | null>(null);
  const [meetingTranscript, setMeetingTranscript] = useState<string>("");
  const [meetingSnapshots, setMeetingSnapshots] = useState<MeetingSnapshot[]>([]);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn("fullscreen toggle failed", e);
    }
  };

  const defaultName = useMemo(
    () => profile?.full_name || user?.email?.split("@")[0] || "Convidado",
    [profile, user]
  );

  // Open meeting from ?room=xxx
  useEffect(() => {
    const room = searchParams.get("room");
    if (!room || stage !== "list") return;
    const found = meetings.find((m) => m.room_name === room);
    if (found) {
      if (!isAuthorizedFor(found)) {
        toast.error("Acesso restrito", {
          description:
            "Apenas convidados pelo anfitrião podem entrar nesta reunião.",
        });
        setSearchParams({}, { replace: true });
        return;
      }
      setActiveMeeting(found);
      setStage("prejoin");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, meetings, stage]);

  const isAuthorizedFor = (m: Meeting | null) => {
    if (!m) return false;
    // Reuniões ad-hoc (entrada por link sem registro) ficam liberadas
    if (m.id === "adhoc") return true;
    if (!user?.id) return false;
    // Anfitrião sempre pode entrar
    if (m.created_by === user.id) return true;
    // Apenas usuários convidados (presentes em participants) podem entrar
    return Array.isArray(m.participants) && m.participants.includes(user.id);
  };

  const handleJoin = (m: Meeting) => {
    if (!isAuthorizedFor(m)) {
      toast.error("Acesso restrito", {
        description:
          "Apenas convidados pelo anfitrião podem entrar nesta reunião.",
      });
      return;
    }
    setActiveMeeting(m);
    setStage("prejoin");
    setSearchParams({ room: m.room_name }, { replace: true });
  };

  const handleCopyLink = async (m: Meeting) => {
    try {
      await navigator.clipboard.writeText(buildShareUrl(m.room_name));
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const handleDelete = async (m: Meeting) => {
    try {
      await remove.mutateAsync(m.id);
      toast.success("Reunião removida");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao remover");
    } finally {
      setPendingDelete(null);
    }
  };

  const handleJoinByLink = () => {
    const value = linkInput.trim();
    if (!value) return;
    let room = value;
    try {
      const url = new URL(value);
      const param = url.searchParams.get("room");
      if (param) room = param;
    } catch {
      /* not a url */
    }
    const found = meetings.find((m) => m.room_name === room);
    if (found) {
      handleJoin(found);
    } else {
      // ad-hoc room — entrar direto
      const adhoc: Meeting = {
        id: "adhoc",
        title: "Reunião por convite",
        description: null,
        room_name: room,
        scheduled_date: new Date().toISOString().slice(0, 10),
        start_time: new Date().toTimeString().slice(0, 5),
        end_time: null,
        participants: [],
        status: "agendada",
        created_by: "",
        created_by_name: "",
        ended_at: null,
        created_at: "",
        updated_at: "",
      };
      setActiveMeeting(adhoc);
      setStage("prejoin");
    }
  };

  const handleLeaveCall = () => {
    setStage("list");
    if (activeMeeting && activeMeeting.id !== "adhoc" && activeMeeting.created_by === user?.id) {
      finish.mutate(activeMeeting.id);
    }
    setActiveMeeting(null);
    setSearchParams({}, { replace: true });
  };

  const handleEndForAll = async () => {
    if (!activeMeeting) return;
    // Guard de segurança: apenas o anfitrião (created_by) pode encerrar
    if (
      !user?.id ||
      activeMeeting.id === "adhoc" ||
      !activeMeeting.created_by ||
      activeMeeting.created_by !== user.id
    ) {
      toast.error("Apenas o anfitrião pode encerrar a reunião para todos");
      setConfirmEndForAll(false);
      return;
    }
    try {
      // Broadcast para todos os participantes saírem
      const channel = supabase.channel(`meeting-control-${activeMeeting.room_name}`);
      await channel.subscribe();
      await channel.send({
        type: "broadcast",
        event: "end_meeting",
        payload: { endedBy: user?.id, at: new Date().toISOString() },
      });
      setTimeout(() => supabase.removeChannel(channel), 500);

      if (activeMeeting.id !== "adhoc") {
        finish.mutate(activeMeeting.id);
      }
      toast.success("Reunião encerrada para todos");
    } catch (e: any) {
      toast.error("Erro ao encerrar", { description: e?.message });
    } finally {
      setConfirmEndForAll(false);
      setStage("list");
      setActiveMeeting(null);
      setSearchParams({}, { replace: true });
    }
  };

  // Listener para receber sinal de "encerrar para todos" durante a chamada
  useEffect(() => {
    if (stage !== "in-call" || !activeMeeting) return;
    const channel = supabase
      .channel(`meeting-control-${activeMeeting.room_name}`)
      .on("broadcast", { event: "end_meeting" }, ({ payload }) => {
        if (payload?.endedBy === user?.id) return; // próprio host já tratado
        toast.warning("O anfitrião encerrou a reunião");
        setStage("list");
        setActiveMeeting(null);
        setSearchParams({}, { replace: true });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [stage, activeMeeting, user?.id, setSearchParams]);

  // ===== IN-CALL =====
  if (stage === "in-call" && activeMeeting) {
    const isHost = Boolean(
      user?.id &&
        activeMeeting.id !== "adhoc" &&
        activeMeeting.created_by &&
        activeMeeting.created_by === user.id
    );
    return (
      <Layout>
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <div className="flex items-center gap-2 text-sm">
              <Video className="h-4 w-4 text-primary" />
              <span className="font-semibold">{activeMeeting.title}</span>
              {isHost && (
                <Badge variant="outline" className="ml-2 border-primary/40 text-primary">
                  Anfitrião
                </Badge>
              )}
              <div className="ml-4 flex items-center gap-2 border-l pl-4 text-xs">
                {activeMeeting.created_by_avatar ? (
                  <img 
                    src={activeMeeting.created_by_avatar} 
                    alt={activeMeeting.created_by_name}
                    className="h-6 w-6 rounded-full border border-primary/20 object-cover shadow-sm"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                    <span className="text-[10px] font-bold text-primary">{activeMeeting.created_by_name?.charAt(0)}</span>
                  </div>
                )}
                <div className="flex flex-col leading-none">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">Conduzindo</span>
                  <span className="font-semibold text-foreground/90">{activeMeeting.created_by_name}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopyLink(activeMeeting)}
              >
                <Copy className="mr-1.5 h-4 w-4" /> Copiar link
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSidePanelOpen((v) => !v)}
                title={sidePanelOpen ? "Ocultar painel" : "Mostrar painel"}
              >
                {sidePanelOpen ? (
                  <PanelRightClose className="mr-1.5 h-4 w-4" />
                ) : (
                  <PanelRightOpen className="mr-1.5 h-4 w-4" />
                )}
                {sidePanelOpen ? "Ocultar painel" : "Transcrição"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Sair de tela cheia" : "Tela cheia"}
              >
                {isFullscreen ? (
                  <Minimize2 className="mr-1.5 h-4 w-4" />
                ) : (
                  <Maximize2 className="mr-1.5 h-4 w-4" />
                )}
                {isFullscreen ? "Sair tela cheia" : "Tela cheia"}
              </Button>
              {isHost && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setManageOpen(true)}
                  >
                    <UsersRound className="mr-1.5 h-4 w-4" /> Participantes
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setInviteOpen(true)}
                  >
                    <UserPlus className="mr-1.5 h-4 w-4" /> Chamar usuário
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setConfirmEndForAll(true)}
                  >
                    <PhoneOff className="mr-1.5 h-4 w-4" /> Encerrar para todos
                  </Button>
                </>
              )}
              <Button size="sm" variant="outline" onClick={() => setConfirmLeave(true)}>
                <X className="mr-1.5 h-4 w-4" /> Sair
              </Button>
            </div>
          </div>
          <div
            className={`flex-1 min-h-0 grid grid-cols-1 gap-2 bg-black p-1 ${
              sidePanelOpen ? "lg:grid-cols-[1fr_360px]" : "lg:grid-cols-1"
            }`}
          >
            <div className="flex-1 min-h-0 bg-black relative">
              <JitsiRoom
                ref={jitsiRef}
                {...({
                  roomName: activeMeeting.room_name,
                  displayName: joinDisplayName || defaultName,
                  avatarUrl: profile?.avatar_url || undefined,
                  email: user?.email || undefined,
                  subject: activeMeeting.title,
                  startWithAudioMuted: audioMuted,
                  startWithVideoMuted: videoMuted,
                  isModerator: isHost,
                  onParticipantJoined: (p: { displayName?: string; id?: string }) => {
                    if (p?.displayName) toast(`${p.displayName} entrou`, { duration: 2500 });
                  },
                  onParticipantLeft: (p: { displayName?: string; id?: string }) => {
                    if (p?.displayName) toast(`${p.displayName} saiu`, { duration: 2500 });
                  },
                  onLeave: handleLeaveCall,
                })}
              />
            </div>
            <div
              className={`${sidePanelOpen ? "hidden lg:flex" : "hidden"} flex-col gap-3 min-h-0`}
            >
              <div className="flex-1 min-h-0 bg-background rounded-md overflow-hidden">
                <MeetingTranscriber
                  roomName={activeMeeting.room_name}
                  meetingId={activeMeeting.id !== "adhoc" ? activeMeeting.id : null}
                  meetingTitle={activeMeeting.title}
                  snapshots={meetingSnapshots.map((s) => s.url)}
                  onSummaryReady={(s, _id, transcript) => {
                    setMeetingSummary(s);
                    setMeetingTranscript(transcript);
                    setSummaryOpen(true);
                  }}
                />
              </div>
              <MeetingSnapshotCapture
                roomName={activeMeeting.room_name}
                snapshots={meetingSnapshots}
                onChange={setMeetingSnapshots}
              />
            </div>
          </div>
        </div>

        <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sair da reunião?</AlertDialogTitle>
              <AlertDialogDescription>
                Você será desconectado. Pode entrar novamente a qualquer momento.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleLeaveCall}>Sair</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={confirmEndForAll} onOpenChange={setConfirmEndForAll}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Encerrar reunião para todos?</AlertDialogTitle>
              <AlertDialogDescription>
                Todos os participantes serão desconectados imediatamente. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleEndForAll}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Encerrar para todos
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {isHost && (
          <>
            <InviteUserDialog
              open={inviteOpen}
              onOpenChange={setInviteOpen}
              meetingTitle={activeMeeting.title}
              meetingId={activeMeeting.id}
              roomName={activeMeeting.room_name}
              meetingCreatedBy={activeMeeting.created_by}
            />
            <ManageParticipantsDialog
              open={manageOpen}
              onOpenChange={setManageOpen}
              fetchParticipants={() => jitsiRef.current?.getParticipants() ?? []}
              myId={jitsiRef.current?.getMyId()}
              onKick={(id) => jitsiRef.current?.kickParticipant(id)}
            />
          </>
        )}

        <MeetingSummaryDialog
          open={summaryOpen}
          onOpenChange={setSummaryOpen}
          summary={meetingSummary}
          meetingTitle={activeMeeting.title}
          transcript={meetingTranscript}
          roomName={activeMeeting.room_name}
          snapshots={meetingSnapshots.map((s) => s.url)}
        />
      </Layout>
    );
  }


  // ===== PRE-JOIN =====
  if (stage === "prejoin" && activeMeeting) {
    return (
      <Layout>
        <div className="container max-w-5xl py-8">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Pronto para entrar</h1>
            <Button variant="ghost" onClick={() => { setStage("list"); setActiveMeeting(null); setSearchParams({}, { replace: true }); }}>
              Voltar
            </Button>
          </div>
          <Card>
            <CardContent className="p-6">
              <PreJoinScreen
                defaultName={defaultName}
                meetingTitle={activeMeeting.title}
                createdByAvatar={activeMeeting.created_by_avatar}
                createdByName={activeMeeting.created_by_name}
                onCancel={() => {
                  setStage("list");
                  setActiveMeeting(null);
                  setSearchParams({}, { replace: true });
                }}
                onJoin={({ displayName, audioMuted: a, videoMuted: v }) => {
                  setJoinDisplayName(displayName);
                  setAudioMuted(a);
                  setVideoMuted(v);
                  setStage("in-call");
                }}
              />
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // ===== LIST =====
  return (
    <Layout>
      <div className="container max-w-6xl space-y-6 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reuniões</h1>
            <p className="text-sm text-muted-foreground">
              Crie, agende e participe de reuniões por vídeo.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Nova reunião
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <LinkIcon className="h-4 w-4" /> Entrar com link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="Cole o link ou código da reunião"
                onKeyDown={(e) => e.key === "Enter" && handleJoinByLink()}
              />
              <Button onClick={handleJoinByLink} disabled={!linkInput.trim()}>
                <LogIn className="mr-1.5 h-4 w-4" /> Entrar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">
              Agendadas {upcoming.length > 0 && `(${upcoming.length})`}
            </TabsTrigger>
            <TabsTrigger value="past">
              Histórico {past.length > 0 && `(${past.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4 space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-10 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : upcoming.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-muted-foreground">
                  <Video className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  Nenhuma reunião agendada.
                </CardContent>
              </Card>
            ) : (
              upcoming.map((m) => (
                <MeetingCard
                  key={m.id}
                  meeting={m}
                  canManage={m.created_by === user?.id}
                  canJoin={isAuthorizedFor(m)}
                  onJoin={handleJoin}
                  onCopy={handleCopyLink}
                  onDelete={(meet) => setPendingDelete(meet)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-4 space-y-3">
            {past.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-muted-foreground">
                  Nenhuma reunião no histórico.
                </CardContent>
              </Card>
            ) : (
              past.map((m) => (
                <MeetingCard
                  key={m.id}
                  meeting={m}
                  canManage={m.created_by === user?.id}
                  canJoin={false}
                  onJoin={handleJoin}
                  onCopy={handleCopyLink}
                  onDelete={(meet) => setPendingDelete(meet)}
                  past
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CreateMeetingDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(m) => {
          setActiveMeeting(m);
        }}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar reunião?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove permanentemente a reunião "{pendingDelete?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => pendingDelete && handleDelete(pendingDelete)}
            >
              Cancelar reunião
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
