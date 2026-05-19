import tkinter as tk
import random

DICE_SIZE = 110
PIP_RADIUS = 9
WINDOW_BG = "#1e2a3a"
DICE_BG = "#fafafa"
DICE_BORDER = "#cccccc"
PIP_COLOR = "#2c3e50"
ACCENT = "#e74c3c"
ACCENT_HOVER = "#c0392b"
TEXT_GOLD = "#f1c40f"
TEXT_GRAY = "#95a5a6"
TEXT_COMBO = "#1abc9c"

PIP_POSITIONS = {
    1: [(0.5, 0.5)],
    2: [(0.27, 0.27), (0.73, 0.73)],
    3: [(0.27, 0.27), (0.5, 0.5), (0.73, 0.73)],
    4: [(0.27, 0.27), (0.73, 0.27), (0.27, 0.73), (0.73, 0.73)],
    5: [(0.27, 0.27), (0.73, 0.27), (0.5, 0.5), (0.27, 0.73), (0.73, 0.73)],
    6: [(0.27, 0.27), (0.73, 0.27), (0.27, 0.5), (0.73, 0.5), (0.27, 0.73), (0.73, 0.73)],
}


def detect_combo(values):
    s = sorted(values)
    if s[0] == s[1] == s[2]:
        return f"🎯 豹子！三个 {s[0]}！"
    if s == [4, 5, 6]:
        return "👑 至尊！"
    if s == [1, 2, 3]:
        return "🌱 至弱"
    if s[2] - s[0] == 2 and len(set(s)) == 3:
        return "✨ 顺子！"
    return None


class DiceGame:
    def __init__(self, root):
        self.root = root
        self.root.title("三骰子游戏")
        self.root.configure(bg=WINDOW_BG)
        self.root.geometry("520x460")
        self.root.resizable(False, False)

        self.values = [1, 1, 1]
        self.roll_count = 0
        self.rolling = False

        tk.Label(
            root,
            text="🎲 三骰子游戏 🎲",
            font=("Microsoft YaHei", 22, "bold"),
            bg=WINDOW_BG,
            fg="white",
        ).pack(pady=(20, 5))

        tk.Label(
            root,
            text="点击按钮或按空格，看看会掷出什么组合",
            font=("Microsoft YaHei", 10),
            bg=WINDOW_BG,
            fg=TEXT_GRAY,
        ).pack(pady=(0, 15))

        frame = tk.Frame(root, bg=WINDOW_BG)
        frame.pack(pady=5)
        self.canvases = []
        for _ in range(3):
            c = tk.Canvas(
                frame,
                width=DICE_SIZE,
                height=DICE_SIZE,
                bg=WINDOW_BG,
                highlightthickness=0,
            )
            c.pack(side=tk.LEFT, padx=8)
            self.canvases.append(c)

        self.sum_label = tk.Label(
            root,
            text="总和: 3",
            font=("Microsoft YaHei", 16, "bold"),
            bg=WINDOW_BG,
            fg=TEXT_GOLD,
        )
        self.sum_label.pack(pady=(15, 5))

        self.combo_label = tk.Label(
            root,
            text=" ",
            font=("Microsoft YaHei", 12, "bold"),
            bg=WINDOW_BG,
            fg=TEXT_COMBO,
        )
        self.combo_label.pack()

        self.btn = tk.Button(
            root,
            text="投掷骰子",
            font=("Microsoft YaHei", 14, "bold"),
            bg=ACCENT,
            fg="white",
            activebackground=ACCENT_HOVER,
            activeforeground="white",
            padx=40,
            pady=8,
            borderwidth=0,
            cursor="hand2",
            command=self.roll,
        )
        self.btn.pack(pady=10)

        self.count_label = tk.Label(
            root,
            text="已投掷: 0 次",
            font=("Microsoft YaHei", 9),
            bg=WINDOW_BG,
            fg=TEXT_GRAY,
        )
        self.count_label.pack()

        self.draw_all()
        root.bind("<space>", lambda e: self.roll())
        root.bind("<Return>", lambda e: self.roll())

    def draw_die(self, canvas, value):
        canvas.delete("all")
        canvas.create_rectangle(
            6, 8, DICE_SIZE - 4, DICE_SIZE - 2,
            fill="#00000022", outline="",
        )
        canvas.create_rectangle(
            4, 4, DICE_SIZE - 6, DICE_SIZE - 6,
            fill=DICE_BG, outline=DICE_BORDER, width=2,
        )
        for px, py in PIP_POSITIONS[value]:
            cx = px * (DICE_SIZE - 10) + 2
            cy = py * (DICE_SIZE - 10) + 2
            canvas.create_oval(
                cx - PIP_RADIUS, cy - PIP_RADIUS,
                cx + PIP_RADIUS, cy + PIP_RADIUS,
                fill=PIP_COLOR, outline="",
            )

    def draw_all(self):
        for c, v in zip(self.canvases, self.values):
            self.draw_die(c, v)
        self.sum_label.config(text=f"总和: {sum(self.values)}")

    def roll(self):
        if self.rolling:
            return
        self.rolling = True
        self.btn.config(state=tk.DISABLED, text="正在投掷...")
        self.combo_label.config(text=" ")
        self.animate(0)

    def animate(self, step):
        total = 10
        if step < total:
            self.values = [random.randint(1, 6) for _ in range(3)]
            self.draw_all()
            delay = int(40 + (step ** 2) * 3)
            self.root.after(delay, self.animate, step + 1)
        else:
            self.values = [random.randint(1, 6) for _ in range(3)]
            self.draw_all()
            self.roll_count += 1
            self.count_label.config(text=f"已投掷: {self.roll_count} 次")
            combo = detect_combo(self.values)
            self.combo_label.config(text=combo if combo else " ")
            self.btn.config(state=tk.NORMAL, text="投掷骰子")
            self.rolling = False


def main():
    root = tk.Tk()
    DiceGame(root)
    root.mainloop()


if __name__ == "__main__":
    main()
