import React, { useEffect, useState } from 'react'
import { dummyConnectionsData } from '../assets/assets'
import { Leaf, Search } from 'lucide-react'
import UserCard from '../components/UserCard'
import Loading from '../components/Loading'
import { useAuth } from '@clerk/clerk-react'
import toast from 'react-hot-toast'
import { useDispatch } from 'react-redux'
import { fetchUser } from '../features/user/userSlice'
import api from '../api/axios'


const Discover = () => {
   const dispatch = useDispatch()
  const [input , setInput] = useState('')
  const [ users , setUsers] = useState([])
  const [loading , setLoading] = useState(false)
   const {getToken} = useAuth()
  /**
   *
   * Discover page par users ko search karne ka function.
   * Agar query blank ho to default recommendations load karta hai.
   */
  const fetchDiscoverUsers = async (searchQuery = '') => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      const { data } = await api.post('/api/user/discover', { input: searchQuery }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) {
        setUsers(data.users);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    if (e.key === 'Enter') {
      fetchDiscoverUsers(input);
    }
  };

  /**
   *
   * [Bug Fix #7 - Infinite Re-render Loop]:
   * Pehle yahan 'useEffect' bina dependency array ke likha tha!
   * Har render ke baad dispatch(fetchUser) chalta tha, Redux state update hoti thi, component re-render hota tha,
   * aur ye cycle infinite loop me fast-forward ho jati thi jisse browser tab hang aur CPU 100% ho jata tha.
   * Ab humne empty dependency array [] provide kiya hai taaki ye sirf initial mount par ek baar execute ho.
   */
  useEffect(() => {
    getToken().then((token) => {
      if (token) dispatch(fetchUser(token));
    });
    // Initial suggested users load karo taaki page blank na dikhe
    fetchDiscoverUsers('');
  }, []);
  return (
    <div className='min-h-screen bg-gradient-to-b from-slate-50 to-white'>
      <div className='max-w-6xl mx-auto p-6'>
{/* Tilte */}
          <div className='mb-8'>
            <h1 className='text-3xl font-bold text-slate-900 mb-2'>Discover People</h1>
            <p className='text-slate-600'>Connect with amazing people and grow your network</p>
          </div>
          {/* search */}
            <div className='mb-8 shadow-md rounded-md border border-slate-200/60 bg-white/80'>
             <div className='p-6'>
              <div className='relative'>
                  <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5'/>
                  <input type="text" placeholder='Search people by name , username , bio , or location...' className='pl-10 sm:pl-12 py-2 w-full border border-gray-300 rounded-md max-sm:text-sm' onChange={(e)=> setInput(e.target.value)} value={input} onKeyUp={handleSearch} />
              </div>
              </div>
              </div>
               <div className='flex flex-wrap gap-6'>
                 {users.map((user)=>(
                  <UserCard user={user} key={user._id}/>
                 ))}
               </div>
               {
                 loading &&(<Loading height='60vh'/>)

               }
      </div>
    </div>
  )
}

export default Discover
