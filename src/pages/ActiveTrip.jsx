import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Clock, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Plus,
  Navigation,
  Phone,
  MessageSquare
} from 'lucide-react';
import { tripsAPI, sosAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ActiveTrip = () => {
  const [trip, setTrip] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isOverdue, setIsOverdue] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState(15);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchActiveTrip();
  }, []);

  useEffect(() => {
    let interval;
    if (trip && trip.status === 'ACTIVE') {
      interval = setInterval(() => {
        updateTimeRemaining();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [trip]);

  const fetchActiveTrip = async () => {
    try {
      const response = await tripsAPI.getActiveTrip();
      if (response.data.trip) {
        setTrip(response.data.trip);
        updateTimeRemaining();
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Failed to fetch active trip:', error);
      toast.error('Failed to load trip data');
      navigate('/dashboard');
    }
  };

  const updateTimeRemaining = () => {
    if (!trip) return;

    const now = new Date();
    const eta = new Date(trip.estimatedArrivalTime);
    const gracePeriod = trip.gracePeriodMinutes * 60 * 1000;
    const deadline = new Date(eta.getTime() + gracePeriod);
    const remaining = deadline.getTime() - now.getTime();

    if (remaining <= 0) {
      setTimeRemaining(0);
      setIsOverdue(true);
    } else {
      setTimeRemaining(remaining);
      setIsOverdue(false);
    }
  };

  const formatTime = (milliseconds) => {
    if (!milliseconds) return '00:00:00';
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const confirmSafeArrival = async () => {
    setIsLoading(true);
    try {
      await tripsAPI.confirmSafe(trip._id);
      toast.success('Trip marked as safe! Well done!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Confirm safe error:', error);
      toast.error(error.message || 'Failed to confirm safe arrival');
    } finally {
      setIsLoading(false);
    }
  };

  const extendTrip = async () => {
    setIsLoading(true);
    try {
      await tripsAPI.extendTrip(trip._id, { additionalMinutes: extendMinutes });
      toast.success(`Trip extended by ${extendMinutes} minutes`);
      setShowExtendModal(false);
      fetchActiveTrip();
    } catch (error) {
      console.error('Extend trip error:', error);
      toast.error(error.message || 'Failed to extend trip');
    } finally {
      setIsLoading(false);
    }
  };

  const triggerSOS = async () => {
    if (!confirm('Are you sure you want to trigger SOS? This will immediately notify all your emergency contacts.')) {
      return;
    }

    setIsLoading(true);
    try {
      await sosAPI.triggerManualSOS({
        reason: 'Manual SOS triggered during active trip',
        location: {
          coordinates: trip.currentCoordinates.coordinates,
          address: 'Current location'
        }
      });
      toast.success('SOS triggered! Emergency contacts have been notified.');
    } catch (error) {
      console.error('SOS error:', error);
      toast.error(error.message || 'Failed to trigger SOS');
    } finally {
      setIsLoading(false);
    }
  };

  const updateLocation = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            await tripsAPI.updateLocation(trip._id, [longitude, latitude]);
            toast.success('Location updated');
            fetchActiveTrip();
          } catch (error) {
            console.error('Update location error:', error);
            toast.error('Failed to update location');
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error('Failed to get current location');
        }
      );
    }
  };

  if (!trip) {
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
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            ← Back to Dashboard
          </Link>
          
          <h1 className="text-3xl font-bold text-white mb-2">Active Trip</h1>
          <p className="text-gray-400">Your journey is being monitored in real-time</p>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trip Details */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Countdown Timer */}
            <div className={`bg-slate-800 rounded-2xl border-2 p-8 text-center ${
              isOverdue ? 'border-red-500' : 'border-slate-700'
            }`}>
              <motion.div
                animate={isOverdue ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mb-4"
              >
                <Clock className={`w-16 h-16 mx-auto ${
                  isOverdue ? 'text-red-400' : 'text-primary-400'
                }`} />
              </motion.div>
              
              <h2 className={`text-2xl font-bold mb-2 ${
                isOverdue ? 'text-red-400' : 'text-white'
              }`}>
                {isOverdue ? 'Trip Overdue!' : 'Time Remaining'}
              </h2>
              
              <div className={`text-5xl font-bold font-mono mb-4 ${
                isOverdue ? 'text-red-400' : 'text-primary-400'
              }`}>
                {formatTime(timeRemaining)}
              </div>
              
              <p className="text-gray-400">
                ETA: {new Date(trip.estimatedArrivalTime).toLocaleString()}
              </p>
              
              {isOverdue && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 p-3 bg-red-500/20 border border-red-500 rounded-lg"
                >
                  <p className="text-red-400 text-sm">
                    Your trip is overdue. Emergency contacts will be notified if you don't confirm your safety.
                  </p>
                </motion.div>
              )}
            </div>

            {/* Route Information */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary-400" />
                Route Information
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full mt-1"></div>
                  <div>
                    <p className="text-white font-medium">From</p>
                    <p className="text-gray-400">{trip.source.address}</p>
                  </div>
                </div>
                
                <div className="border-l-2 border-gray-600 ml-1.5 h-4"></div>
                
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 bg-red-400 rounded-full mt-1"></div>
                  <div>
                    <p className="text-white font-medium">To</p>
                    <p className="text-gray-400">{trip.destination.address}</p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={updateLocation}
                className="mt-4 w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Navigation className="w-4 h-4" />
                Update Current Location
              </button>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={confirmSafeArrival}
                disabled={isLoading}
                className="py-4 px-6 bg-safe-600 hover:bg-safe-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                {isLoading ? 'Processing...' : "I'm Safe - Confirm Arrival"}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowExtendModal(true)}
                className="py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Extend Time
              </motion.button>
            </div>
          </motion.div>

          {/* Emergency Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {/* SOS Button */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Emergency SOS
              </h3>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={triggerSOS}
                disabled={isLoading}
                className="w-full py-6 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all duration-200 disabled:opacity-50 shadow-lg shadow-red-600/25"
              >
                <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                TRIGGER SOS
              </motion.button>
              
              <p className="text-gray-400 text-sm mt-3 text-center">
                Immediate alert to all emergency contacts
              </p>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <button className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                  <Phone className="w-4 h-4" />
                  Call Emergency Services
                </button>
                
                <button className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Message Contacts
                </button>
              </div>
            </div>

            {/* Trip Info */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Trip Details</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Started</span>
                  <span className="text-white">{new Date(trip.startTime).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Grace Period</span>
                  <span className="text-white">{trip.gracePeriodMinutes} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className="text-primary-400">{trip.status}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Extend Modal */}
      <AnimatePresence>
        {showExtendModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowExtendModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-800 rounded-2xl border border-slate-700 p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-semibold text-white mb-4">Extend Trip Time</h3>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Additional minutes: {extendMinutes}
                </label>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={extendMinutes}
                  onChange={(e) => setExtendMinutes(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>5 min</span>
                  <span>120 min</span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExtendModal(false)}
                  className="flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={extendTrip}
                  disabled={isLoading}
                  className="flex-1 py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Extending...' : 'Extend Trip'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ActiveTrip;
