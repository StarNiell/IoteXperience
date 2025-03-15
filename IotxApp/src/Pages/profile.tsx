import { useAuth } from '../Auth/auth.tsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';

function Profile() {
    const { auth, user } = useAuth();
    

    let username: string = user?.data?.User?.Username;
    return (
        <>
            <div className="d-flex justify-content-center mt-5">
                <h1>Profile page</h1>
            </div>
            <div className="d-flex justify-content-center mt-5">
                <p className="read-the-docs">
                    <FontAwesomeIcon icon={faUser} fontSize={20} /><span style={{ paddingLeft: '8px' }}>{username}</span>
                </p>
            </div>
        </>
    )
}

export default Profile
