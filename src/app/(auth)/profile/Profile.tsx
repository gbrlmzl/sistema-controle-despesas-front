'use client'

import styles from './Profile.module.css';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/hooks/useProfile';
import { useCurrentUser } from '@/components/providers/UserProvider';
import Snackbar from '@/components/ui/Snackbar';



export default function Profile() {

    const user = useCurrentUser();
    const router = useRouter();
    const {
        avatars,
        galleryOpen,
        selectedAvatar,
        loadingChangeProfilePicture,
        openGallery,
        closeGallery,
        selectAvatar,
        confirmChangeProfilePicture,
        snackbarOpen,
        snackbarMsg,
        closeSnackbar,
        snackbarType,
        editingName,
        nameValue,
        setNameValue,
        savingName,
        startEditName,
        cancelEditName,
        saveName,
    } = useProfile({ onProfileUpdated: () => router.refresh() });

    if (!user) {
        return null;
    }

    return (
        <div className={styles.container}>
            <h1>Minha conta</h1>
            <div>
                <div className={styles.profilePictureContainer}>
                    <div className={styles.profilePicture}>
                        <img src={user.profilePic || "/icons/profileIcon.svg"} alt="Perfil" />
                    </div>
                    <button className={styles.profilePictureEdit} onClick={openGallery}>
                        <span className={styles.profilePictureEditIcon}>
                            <img src="/icons/penEditIcon.svg" alt="Editar foto" />
                        </span>
                    </button>
                </div>



                <div className={styles.profileDetails}>
                    {editingName ? (
                        <span className={styles.editNameRow}>
                            <input
                                className={styles.editNameInput}
                                type="text"
                                value={nameValue}
                                onChange={(e) => setNameValue(e.target.value)}
                                disabled={savingName}
                                autoFocus
                            />
                            <button className={styles.editNameAction} onClick={cancelEditName} disabled={savingName} type="button">
                                <img src="/icons/uncheckedIcon.svg" alt="Cancelar" />
                            </button>
                            <button className={styles.editNameAction} onClick={saveName} disabled={savingName} type="button">
                                <img src="/icons/checkedIcon.svg" alt="Confirmar" />
                            </button>
                        </span>
                    ) : (
                        <span className={styles.editNameRow}>
                            <strong>Nome:</strong> {user.name}
                            <button className={styles.editNameAction} onClick={() => startEditName(user.name)} type="button">
                                <img src="/icons/penEditIcon.svg" alt="Editar nome" />
                            </button>
                        </span>
                    )}
                    <span>
                        <strong>Usuário:</strong> {user.username ?? "—"}
                    </span>
                    <span>
                        <strong>Email:</strong> {user.email}

                    </span>
                </div>
                {user.hasPassword && (
                    <div className={styles.profileActions}>
                        <Link href="/profile/settings/password" className={styles.changePasswordLinkButton}>Alterar senha</Link>
                    </div>)
                }

                {galleryOpen && (
                    <div className={styles.galleryOverlay} role="dialog" aria-modal="true" aria-label="Escolher foto de perfil">
                        <div className={styles.galleryModal}>
                            <h2 className={styles.galleryTitle}>Escolha uma foto de perfil</h2>
                            <div className={styles.galleryGrid}>
                                {avatars.map((avatar) => (
                                    <button
                                        key={avatar}
                                        type="button"
                                        className={`${styles.avatarOption} ${selectedAvatar === avatar ? styles.avatarOptionSelected : ''}`}
                                        onClick={() => selectAvatar(avatar)}
                                        aria-pressed={selectedAvatar === avatar}
                                    >
                                        <img src={avatar} alt="Avatar" />
                                    </button>
                                ))}
                            </div>
                            <div className={styles.galleryActions}>
                                <button className={styles.profilePictureChangeButton} onClick={closeGallery} disabled={loadingChangeProfilePicture}>
                                    <span className={styles.profilePictureChangeButtonIcon}>
                                        <img src="/icons/uncheckedIcon.svg" alt="Cancelar" />
                                    </span>
                                </button>
                                <button className={styles.profilePictureChangeButton} onClick={confirmChangeProfilePicture} disabled={!selectedAvatar || loadingChangeProfilePicture}>
                                    <span className={styles.profilePictureChangeButtonIcon}>
                                        <img src="/icons/checkedIcon.svg" alt="Confirmar" />
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <Snackbar open={snackbarOpen} message={snackbarMsg} onClose={closeSnackbar} type={snackbarType} />



            </div>
        </div>
    )
}
