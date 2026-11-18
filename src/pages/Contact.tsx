import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Check, CheckCheck, Mail, MapPin, Phone, Send } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/sreeshivanilogo.png";

const TOPICS = ["Product Questions", "Order Support", "Bulk Orders"] as const;
type Topic = (typeof TOPICS)[number];

type Entry = {
  id: number;
  name: string;
  email: string;
  topic: Topic | null;
  message: string;
  at: Date;
  state: "sending" | "received" | "failed";
  reply: boolean; // the shop's thank-you has arrived
  receipt: boolean; // the carbon copy has been torn off
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const wait = (ms: number) =>
  prefersReducedMotion() ? Promise.resolve() : new Promise((r) => setTimeout(r, ms));

const timeOf = (d: Date) =>
  d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

/** A message from the shop (left) or from the visitor (right). */
const Bubble = ({
  from,
  children,
  className = "",
  id,
}: {
  from: "shop" | "you";
  children: React.ReactNode;
  className?: string;
  id?: string;
}) => (
  <div
    id={id}
    className={`bubble-in max-w-[88%] sm:max-w-[75%] px-4 py-3 text-[15px] leading-[1.55] ${
      from === "shop"
        ? "self-start rounded-[18px] rounded-bl-md bg-emerald-800 text-cream"
        : "self-end rounded-[18px] rounded-br-md bg-gold-400 text-emerald-950"
    } ${className}`}
  >
    {children}
  </div>
);

const Typing = () => (
  <div
    role="status"
    className="bubble-in self-start flex gap-1.5 rounded-[18px] rounded-bl-md bg-emerald-800 px-4 py-3.5"
  >
    <span className="sr-only">Sree Shivani Foods is typing</span>
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        aria-hidden="true"
        className="typing-dot h-1.5 w-1.5 rounded-full bg-mist"
        style={{ animationDelay: `${i * 0.15}s` }}
      />
    ))}
  </div>
);

const Receipt = ({ entry }: { entry: Entry }) => (
  <div className="bubble-in receipt self-center w-full max-w-sm rounded-xl bg-cream text-emerald-950 px-5 pb-4 pt-5">
    <p className="flex items-center justify-between text-[13px] font-bold uppercase tracking-[0.08em] text-emerald-900">
      Your copy
      <span className="font-display normal-case tracking-normal text-[15px] text-emerald-900 tabular-nums">
        {entry.at.toLocaleDateString("en-IN", { day: "numeric", month: "short" })},{" "}
        {timeOf(entry.at)}
      </span>
    </p>
    <dl className="mt-3 space-y-1.5 text-[15px]">
      {[
        ["Name", entry.name],
        ["Email", entry.email],
        ...(entry.topic ? [["Subject", entry.topic]] : []),
        ["Message", entry.message],
      ].map(([label, value]) => (
        <div key={label} className="flex gap-3">
          <dt className="w-[4.5rem] shrink-0 text-emerald-900/85">{label}</dt>
          <dd className={`min-w-0 break-words ${label === "Message" ? "line-clamp-3" : "font-semibold"}`}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  </div>
);

const Contact = () => {
  const { user } = useAuth();
  const [shown, setShown] = useState(prefersReducedMotion() ? 3 : 0);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [history, setHistory] = useState<Entry[]>([]);
  const [acted, setActed] = useState(false); // only scroll once the visitor has done something
  const threadRef = useRef<HTMLDivElement>(null);
  const sending = history.some((e) => e.state === "sending");

  // Signed-in visitors don't retype their name and email
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      name: f.name || user.user_metadata?.full_name || "",
      email: f.email || user.email || "",
    }));
  }, [user]);

  // The shop's opening messages arrive one by one
  useEffect(() => {
    if (shown >= 3) return;
    const id = window.setTimeout(() => setShown((n) => n + 1), shown === 0 ? 500 : 750);
    return () => window.clearTimeout(id);
  }, [shown]);

  // After a visitor action, keep the right message in view inside the desktop thread:
  // the newest bubble while composing, and the visitor's own message (with its
  // "Received" tick) at the top once the reply and receipt arrive
  useEffect(() => {
    const el = threadRef.current;
    if (!acted || !el || el.scrollHeight <= el.clientHeight) return;
    const behavior = prefersReducedMotion() ? "auto" : "smooth";
    const last = history[history.length - 1];
    const sentBubble = last && last.state !== "sending" ? document.getElementById(`msg-${last.id}`) : null;
    if (sentBubble) {
      el.scrollTo({ top: Math.max(0, sentBubble.offsetTop - 28), behavior });
    } else {
      el.scrollTo({ top: el.scrollHeight, behavior });
    }
  }, [acted, topic, history]);

  const update = (id: number, patch: Partial<Entry>) =>
    setHistory((h) => h.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setActed(true);
    const entry: Entry = {
      id: Date.now(),
      name: form.name.trim(),
      email: form.email.trim(),
      topic,
      message: form.message.trim(),
      at: new Date(),
      state: "sending",
      reply: false,
      receipt: false,
    };
    // the visitor's bubble appears at once, with a single tick while it sends
    setHistory((h) => [...h, entry]);
    setTopic(null);
    setForm((f) => ({ ...f, message: "" }));

    const { error } = await supabase.from("contact_messages").insert({
      name: entry.name,
      email: entry.email,
      topic: entry.topic,
      message: entry.message,
      user_id: user?.id ?? null,
    });
    if (error) {
      console.error("Contact message failed:", error);
      update(entry.id, { state: "failed" });
      setForm((f) => ({ ...f, message: f.message || entry.message }));
      return;
    }
    update(entry.id, { state: "received" });
    await wait(600);
    update(entry.id, { reply: true });
    await wait(400);
    update(entry.id, { receipt: true });
  };

  const inputClass =
    "w-full rounded-xl border border-gold-400/30 bg-emerald-950/60 px-4 py-3 text-[15px] text-cream placeholder:text-mist/70 transition-colors focus:border-gold-300 focus:outline-none";

  return (
    <div className="bg-emerald-950 text-cream">
      <section className="pt-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-10 lg:py-12 grid gap-10 lg:gap-16 lg:grid-cols-[24rem_1fr]">
          {/* How to reach us */}
          <div className="lg:pt-4">
            <h1 className="font-display font-light animate-rise text-5xl sm:text-6xl lg:text-[4.25rem] leading-[1.02] tracking-[-0.025em]">
              Get in <span className="italic text-gold-400">Touch</span>
            </h1>

            <ul
              className="animate-rise mt-10 space-y-5 text-[17px]"
              style={{ animationDelay: "0.08s" }}
            >
              <li>
                <a
                  href="tel:+919964560622"
                  className="group flex items-center gap-4 text-cream hover:text-gold-300 transition-colors"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold-400/40 text-gold-300 transition-colors group-hover:bg-gold-400 group-hover:text-emerald-950">
                    <Phone size={18} strokeWidth={1.6} />
                  </span>
                  <span className="tabular-nums">9964560622</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:sreeshivanifoods@gmail.com"
                  className="group flex items-center gap-4 text-cream hover:text-gold-300 transition-colors"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold-400/40 text-gold-300 transition-colors group-hover:bg-gold-400 group-hover:text-emerald-950">
                    <Mail size={18} strokeWidth={1.6} />
                  </span>
                  sreeshivanifoods@gmail.com
                </a>
              </li>
              <li className="flex items-start gap-4 text-mist">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold-400/40 text-gold-300">
                  <MapPin size={18} strokeWidth={1.6} />
                </span>
                <span className="pt-2.5 leading-relaxed">
                  #5187/A-22, Banashankari Badavane Davangere-577004, Karnataka
                </span>
              </li>
            </ul>
          </div>

          {/* The thread: natural height on phones, a fixed window on desktop */}
          <div className="flex flex-col overflow-hidden rounded-[14px] border border-gold-400/30 bg-emerald-900 lg:h-[min(46rem,calc(100svh-10.5rem))] lg:min-h-[34rem]">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-gold-400/15 px-5 py-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-950 ring-1 ring-gold-400/40">
                <img src={logo} alt="" className="w-[80%] h-auto" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-cream">Sree Shivani Foods</p>
                <p className="text-[13px] text-mist">Replies by phone or email</p>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={threadRef}
              className="thread-scroll relative flex flex-1 flex-col gap-3 px-5 py-5 lg:overflow-y-auto"
              aria-live="polite"
            >
              {shown === 0 && <Typing />}
              {shown >= 1 && (
                <Bubble from="shop">
                  We'd love to hear from you. Reach out with any questions or
                  feedback.
                </Bubble>
              )}
              {shown === 1 && <Typing />}
              {shown >= 2 && (
                <Bubble from="shop">
                  <p className="font-semibold">Business Hours</p>
                  <dl className="mt-1.5 grid grid-cols-[auto_auto] gap-x-4 sm:gap-x-6 gap-y-1 text-[15px]">
                    <dt className="text-mist">Monday - Friday:</dt>
                    <dd className="tabular-nums whitespace-nowrap">9:00 AM - 6:00 PM</dd>
                    <dt className="text-mist">Saturday:</dt>
                    <dd className="tabular-nums whitespace-nowrap">10:00 AM - 4:00 PM</dd>
                    <dt className="text-mist">Sunday:</dt>
                    <dd>Closed</dd>
                  </dl>
                </Bubble>
              )}
              {shown === 2 && <Typing />}
              {shown >= 3 && (
                <Bubble from="shop">
                  What's this about?
                  <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Topic">
                    {TOPICS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setActed(true);
                          setTopic(t);
                        }}
                        aria-pressed={topic === t}
                        className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                          topic === t
                            ? "border-gold-400 bg-gold-400 text-emerald-950"
                            : "border-gold-400/60 text-gold-200 hover:bg-gold-400/10"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </Bubble>
              )}

              {/* Everything the visitor has sent so far */}
              {history.map((entry) => (
                <React.Fragment key={entry.id}>
                  {entry.topic && <Bubble from="you">{entry.topic}</Bubble>}
                  <Bubble id={`msg-${entry.id}`} from="you" className={`whitespace-pre-wrap ${entry.state === "failed" ? "opacity-80" : ""}`}>
                    {entry.message}
                    <span className="mt-1.5 flex items-center justify-end gap-1 text-[13px] font-semibold text-emerald-950">
                      {timeOf(entry.at)}
                      {entry.state === "sending" && <Check size={14} strokeWidth={2.2} aria-label="Sending" />}
                      {entry.state === "received" && (
                        <>
                          <CheckCheck size={14} strokeWidth={2.2} />
                          Received
                        </>
                      )}
                      {entry.state === "failed" && (
                        <>
                          <AlertCircle size={14} strokeWidth={2.2} />
                          Not sent
                        </>
                      )}
                    </span>
                  </Bubble>

                  {entry.state === "failed" && (
                    <Bubble from="shop" className="!bg-rose-950/60 ring-1 ring-rose-300/30">
                      We couldn't send your message just now. Please call us on{" "}
                      <a href="tel:+919964560622" className="font-semibold underline">
                        9964560622
                      </a>{" "}
                      or email{" "}
                      <a href="mailto:sreeshivanifoods@gmail.com" className="font-semibold underline">
                        sreeshivanifoods@gmail.com
                      </a>
                      .
                    </Bubble>
                  )}
                  {entry.state === "received" && !entry.reply && <Typing />}
                  {entry.reply && (
                    <Bubble from="shop">
                      Thank you for your message! We'll get back to you soon.
                    </Bubble>
                  )}
                  {entry.receipt && <Receipt entry={entry} />}
                </React.Fragment>
              ))}

              {topic && <Bubble from="you">{topic}</Bubble>}
            </div>

            {/* Composer: always open, so a second message just continues the thread */}
            <form onSubmit={handleSubmit} className="border-t border-gold-400/15 px-5 py-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="sr-only">Your Name *</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="email" className="sr-only">Your Email *</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Enter your email address"
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label htmlFor="message" className="sr-only">Your Message *</label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={2}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Tell us how we can help you..."
                    className={`${inputClass} resize-none`}
                  />
                </div>
                <button
                  type="submit"
                  aria-label="Send Message"
                  disabled={sending}
                  className="btn-gold shrink-0 !px-5 !py-3.5"
                >
                  {sending ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-950/30 border-t-emerald-950" />
                  ) : (
                    <Send size={16} strokeWidth={1.8} />
                  )}
                  <span className="hidden sm:inline">Send Message</span>
                </button>
              </div>
              <p className="text-[13px] text-mist">
                By submitting this form, you agree to our{" "}
                <Link to="/terms" className="text-gold-300 underline decoration-gold-400/40 hover:text-gold-200">
                  Terms and Conditions
                </Link>
              </p>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
