import styles from "@/components/CatalogLoading.module.css";

// This boundary belongs only to the directory, never to a detail route.
export function CatalogLoading() {
  return <div className={styles.grid} aria-busy="true" aria-hidden="true">
    {Array.from({ length: 6 }, (_, card) => <div key={card}>
      <span className={styles.media} />
      <span className={styles.label} />
      <span className={styles.name} />
      <span className={styles.lead} />
    </div>)}
  </div>;
}
