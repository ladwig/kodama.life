import Image from "next/image";
import styles from "./page.module.css";
import SignupForm from "./components/SignupForm";

export default function Home() {
  return (
    <main className={styles.container}>
      {/* Ink splatter dots */}
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />

      <div className={styles.content}>
        <h1 className={styles.title}>Kodama</h1>
        <p className={styles.details}>
          22. August 2026
          <br />
          Kiekebusch See
        </p>

        <Image
          className={styles.illustration}
          src="/kodama.png"
          alt="Kodama spirit"
          width={200}
          height={240}
          priority
        />

        <SignupForm />
      </div>
    </main>
  );
}
