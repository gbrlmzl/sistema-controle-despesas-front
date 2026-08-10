import Image from "next/image";
import styles from "./page.module.css";
import Link from "next/link";
import Inicio from "./Inicio";

export default function Home() {

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Inicio />
      </main>
      <footer className={styles.footer}>
      </footer>
    </div>
  );
}
