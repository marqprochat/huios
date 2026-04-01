import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get system settings
export const getSettings = async (req: Request, res: Response) => {
  try {
    let settings = await prisma.systemSettings.findFirst();
    
    // If no settings exist, create default
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          institutionName: 'Huios Seminário Teológico',
          radiusMeters: 100
        }
      });
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

// Update system settings
export const updateSettings = async (req: Request, res: Response) => {
  try {
    const { 
      institutionName,
      locationName,
      latitude,
      longitude,
      radiusMeters,
      contactEmail,
      contactPhone
    } = req.body;

    let settings = await prisma.systemSettings.findFirst();
    
    if (settings) {
      // Update existing
      settings = await prisma.systemSettings.update({
        where: { id: settings.id },
        data: {
          institutionName: institutionName ?? settings.institutionName,
          locationName: locationName ?? settings.locationName,
          latitude: latitude !== undefined ? latitude : settings.latitude,
          longitude: longitude !== undefined ? longitude : settings.longitude,
          radiusMeters: radiusMeters ?? settings.radiusMeters,
          contactEmail: contactEmail ?? settings.contactEmail,
          contactPhone: contactPhone ?? settings.contactPhone
        }
      });
    } else {
      // Create new
      settings = await prisma.systemSettings.create({
        data: {
          institutionName: institutionName || 'Huios Seminário Teológico',
          locationName,
          latitude,
          longitude,
          radiusMeters: radiusMeters || 100,
          contactEmail,
          contactPhone
        }
      });
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};
