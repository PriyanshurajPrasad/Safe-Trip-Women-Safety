import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  MapPin, 
  Clock, 
  Shield, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  Plus,
  History,
  Activity
} from 'lucide-react';
import { tripsAPI, contactsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [activeTrip, setActiveTrip] = useState(null);
  const [recentTrips, setRecentTrips] = useState([]);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const { user, logout } = useAuth();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [activeTripRes, historyRes, contactsRes, statsRes] = await Promise.all([
        tripsAPI.getActiveTrip().catch(() => ({ data: null })),
        tripsAPI.getTripHistory({ limit: 3 }).catch(() => ({ data: { trips: [] } })),
        contactsAPI.getEmergencyList().catch(() => ({ data: { contacts: [] } })),
        tripsAPI.getTripStatistics().catch(() => ({ data: { statistics: null } })),
      ]);

      setActiveTrip(activeTripRes.data?.data?.trip || null);
      setRecentTrips(historyRes.data?.data?.trips || []);
      setEmergencyContacts(contactsRes.data?.data?.contacts || []);
      setStatistics(statsRes.data?.data?.statistics || null);
    } catch (error) {
      console.error('Dashboard error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-blue-400 bg-blue-400/10';
      case 'COMPLETED':
        return 'text-green-400 bg-green-400/10';
      case 'EMERGENCY_TRIGGERED':
        return 'text-red-400 bg-red-400/10';
      case 'CANCELLED':
        return 'text-gray-400 bg-gray-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-gray-400">Your safety dashboard</p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </motion.div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Current Trip Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-slate-800 rounded-2xl border border-slate-700 p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-400" />
              Current Trip
            </h2>
            {activeTrip ? (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(activeTrip.status)}`}>
                {activeTrip.status.replace('_', ' ')}
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-sm font-medium text-gray-400 bg-gray-400/10">
                No Active Trip
              </span>
            )}
          </div>

          {activeTrip ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-400">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">From</span>
                  </div>
                  <p className="text-white font-medium">{activeTrip.source.address}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-400">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">To</span>
                  </div>
                  <p className="text-white font-medium">{activeTrip.destination.address}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-gray-400">
                <Clock className="w-4 h-4" />
                <span className="text-sm">ETA: {formatTime(activeTrip.estimatedArrivalTime)}</span>
              </div>

              <div className="flex gap-3">
                <Link
                  to="/active-trip"
                  className="flex-1 py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors text-center"
                >
                  View Trip
                </Link>
                <button
                  className="py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
                >
                  Extend Time
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-6">No active trip. Start a new journey to stay safe.</p>
              <Link
                to="/start-trip"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                Start New Trip
              </Link>
            </div>
          )}
        </motion.div>

        {/* Emergency Contacts */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800 rounded-2xl border border-slate-700 p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-400" />
              Emergency Contacts
            </h2>
            <Link
              to="/contacts"
              className="text-primary-400 hover:text-primary-300 text-sm transition-colors"
            >
              Manage
            </Link>
          </div>

          <div className="space-y-3">
            {emergencyContacts.slice(0, 3).map((contact) => (
              <div key={contact._id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <div>
                  <p className="text-white font-medium">{contact.name}</p>
                  <p className="text-gray-400 text-sm">{contact.relation}</p>
                </div>
                {contact.isPrimary && (
                  <span className="px-2 py-1 bg-primary-600/20 text-primary-400 text-xs rounded-full">
                    Primary
                  </span>
                )}
              </div>
            ))}

            {emergencyContacts.length === 0 && (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm mb-4">No emergency contacts added</p>
                <Link
                  to="/contacts"
                  className="text-primary-400 hover:text-primary-300 text-sm transition-colors"
                >
                  Add Contacts
                </Link>
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent History */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-800 rounded-2xl border border-slate-700 p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-primary-400" />
              Recent Trips
            </h2>
            <Link
              to="/history"
              className="text-primary-400 hover:text-primary-300 text-sm transition-colors"
            >
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {recentTrips.map((trip) => (
              <div key={trip._id} className="p-3 bg-slate-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white font-medium text-sm truncate">
                    {trip.destination.address}
                  </p>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(trip.status)}`}>
                    {trip.status === 'COMPLETED' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                    {trip.status === 'EMERGENCY_TRIGGERED' && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                    {trip.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-gray-400 text-xs">
                  {formatTime(trip.startTime)}
                </p>
              </div>
            ))}

            {recentTrips.length === 0 && (
              <div className="text-center py-8">
                <History className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No trip history yet</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* SOS Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-800 rounded-2xl border border-slate-700 p-6"
        >
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Emergency SOS
          </h2>
          
          <div className="text-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {/* Handle SOS */}}
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-600/25"
            >
              <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
              Trigger SOS
            </motion.button>
            <p className="text-gray-400 text-sm mt-3">
              Immediate alert to all emergency contacts
            </p>
          </div>
        </motion.div>

        {/* Statistics */}
        {statistics && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-slate-800 rounded-2xl border border-slate-700 p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-400" />
              Statistics
            </h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Trips</span>
                <span className="text-white font-semibold">{statistics.totalTrips || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Completed</span>
                <span className="text-green-400 font-semibold">
                  {statistics.byStatus?.COMPLETED || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Emergencies</span>
                <span className="text-red-400 font-semibold">
                  {statistics.byStatus?.EMERGENCY_TRIGGERED || 0}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
