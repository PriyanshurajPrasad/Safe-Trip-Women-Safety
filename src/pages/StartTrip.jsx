import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Clock, 
  Calendar,
  Users,
  Shield,
  ArrowLeft,
  Navigation
} from 'lucide-react';
import { tripsAPI, contactsAPI } from '../services/api';
import toast from 'react-hot-toast';

const StartTrip = () => {
  const [formData, setFormData] = useState({
    source: {
      address: '',
      coordinates: [0, 0] // [longitude, latitude]
    },
    destination: {
      address: '',
      coordinates: [0, 0]
    },
    estimatedArrivalTime: '',
    gracePeriodMinutes: 5,
    notes: ''
  });
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const navigate = useNavigate();

  React.useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await contactsAPI.getEmergencyList();
      setContacts(response.data.contacts || []);
      // Select primary contact by default
      const primaryContact = response.data.contacts?.find(c => c.isPrimary);
      if (primaryContact) {
        setSelectedContacts([primaryContact._id]);
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    }
  };

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData(prev => ({
            ...prev,
            source: {
              ...prev.source,
              coordinates: [longitude, latitude],
              address: `Current Location (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`
            }
          }));
          setIsGettingLocation(false);
          toast.success('Current location captured');
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error('Failed to get current location');
          setIsGettingLocation(false);
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
      setIsGettingLocation(false);
    }
  };

  const handleAddressChange = (field, address) => {
    setFormData(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        address
      }
    }));
  };

  const handleETAChange = (eta) => {
    // Convert to ISO string for backend
    const etaDate = new Date(eta);
    setFormData(prev => ({
      ...prev,
      estimatedArrivalTime: etaDate.toISOString()
    }));
  };

  const handleContactToggle = (contactId) => {
    setSelectedContacts(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const calculateMinETA = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15); // Minimum 15 minutes from now
    return now.toISOString().slice(0, 16);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate coordinates (for demo, we'll use dummy coordinates)
      const tripData = {
        ...formData,
        source: {
          ...formData.source,
          coordinates: [77.2090, 28.6139] // Delhi coordinates as dummy
        },
        destination: {
          ...formData.destination,
          coordinates: [77.2090, 28.6139] // Delhi coordinates as dummy
        }
      };

      const response = await tripsAPI.startTrip(tripData);
      toast.success('Trip started successfully!');
      navigate('/active-trip');
    } catch (error) {
      console.error('Start trip error:', error);
      toast.error(error.message || 'Failed to start trip');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    return (
      formData.source.address &&
      formData.destination.address &&
      formData.estimatedArrivalTime &&
      selectedContacts.length > 0
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
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
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          
          <h1 className="text-3xl font-bold text-white mb-2">Start New Journey</h1>
          <p className="text-gray-400">Set up your trip for real-time monitoring</p>
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* Source Location */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-400" />
                Starting Point
              </h2>
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={isGettingLocation}
                className="flex items-center gap-2 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-lg transition-colors disabled:opacity-50"
              >
                {isGettingLocation ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full"
                  />
                ) : (
                  <>
                    <Navigation className="w-4 h-4" />
                    Current Location
                  </>
                )}
              </button>
            </div>
            
            <input
              type="text"
              value={formData.source.address}
              onChange={(e) => handleAddressChange('source', e.target.value)}
              placeholder="Enter starting address"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
              required
            />
          </div>

          {/* Destination */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-400" />
              Destination
            </h2>
            
            <input
              type="text"
              value={formData.destination.address}
              onChange={(e) => handleAddressChange('destination', e.target.value)}
              placeholder="Enter destination address"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
              required
            />
          </div>

          {/* ETA */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Estimated Arrival Time
            </h2>
            
            <div className="space-y-4">
              <input
                type="datetime-local"
                min={calculateMinETA()}
                value={formData.estimatedArrivalTime ? new Date(formData.estimatedArrivalTime).toISOString().slice(0, 16) : ''}
                onChange={(e) => handleETAChange(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                required
              />
              
              {/* Grace Period Slider */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Grace Period: {formData.gracePeriodMinutes} minutes
                </label>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={formData.gracePeriodMinutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, gracePeriodMinutes: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1 min</span>
                  <span>30 mins</span>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Contacts */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-400" />
              Notify Contacts
            </h2>
            
            <div className="space-y-3">
              {contacts.map((contact) => (
                <label
                  key={contact._id}
                  className="flex items-center justify-between p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(contact._id)}
                      onChange={() => handleContactToggle(contact._id)}
                      className="w-4 h-4 text-primary-600 bg-slate-600 border-slate-500 rounded focus:ring-primary-500"
                    />
                    <div>
                      <p className="text-white font-medium">{contact.name}</p>
                      <p className="text-gray-400 text-sm">{contact.relation} • {contact.phone}</p>
                    </div>
                  </div>
                  {contact.isPrimary && (
                    <span className="px-2 py-1 bg-primary-600/20 text-primary-400 text-xs rounded-full">
                      Primary
                    </span>
                  )}
                </label>
              ))}
              
              {contacts.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm mb-4">No emergency contacts found</p>
                  <Link
                    to="/contacts"
                    className="text-primary-400 hover:text-primary-300 text-sm transition-colors"
                  >
                    Add Emergency Contacts
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Additional Notes (Optional)</h2>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any additional information about your trip..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors resize-none"
            />
            <p className="text-gray-400 text-xs mt-1">
              {formData.notes.length}/500 characters
            </p>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isLoading || !isFormValid()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 px-6 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              />
            ) : (
              <>
                <Shield className="w-5 h-5" />
                Start Journey - Begin Monitoring
              </>
            )}
          </motion.button>
        </motion.form>
      </div>
    </div>
  );
};

export default StartTrip;
