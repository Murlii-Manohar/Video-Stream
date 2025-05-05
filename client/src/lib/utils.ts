import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class names using clsx and applies Tailwind's merge strategy
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date string or Date object into a standardized readable format
 * @param dateInput Date string or Date object to format
 * @param includeTime Whether to include the time component
 * @returns Formatted date string
 */
export function formatDate(
  dateInput: string | Date | null | undefined,
  includeTime: boolean = false
): string {
  if (!dateInput) return "N/A";
  
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  
  if (isNaN(date.getTime())) return "Invalid date";
  
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(includeTime && { hour: "2-digit", minute: "2-digit" }),
  };
  
  return new Intl.DateTimeFormat("en-US", options).format(date);
}

/**
 * Formats a duration in seconds to a readable time format (HH:MM:SS or MM:SS)
 * @param seconds Duration in seconds
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds && seconds !== 0) return "00:00";
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(remainingSeconds).padStart(2, "0");
  
  if (hours > 0) {
    const formattedHours = String(hours).padStart(2, "0");
    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  }
  
  return `${formattedMinutes}:${formattedSeconds}`;
}

/**
 * Formats a number for display with K/M/B suffixes for thousands/millions/billions
 * @param value Number to format
 * @returns Formatted number string with appropriate suffix
 */
export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined) return "0";
  
  // Handle negative numbers
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  
  let formatted: string;
  
  if (absValue >= 1_000_000_000) {
    formatted = (absValue / 1_000_000_000).toFixed(1) + "B";
  } else if (absValue >= 1_000_000) {
    formatted = (absValue / 1_000_000).toFixed(1) + "M";
  } else if (absValue >= 1_000) {
    formatted = (absValue / 1_000).toFixed(1) + "K";
  } else {
    formatted = absValue.toString();
  }
  
  // Remove trailing ".0" if present
  formatted = formatted.replace(/\.0([KMB])?$/, "$1");
  
  return isNegative ? "-" + formatted : formatted;
}

/**
 * Truncates a string to a specified maximum length and adds an ellipsis if truncated
 * @param str String to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated string with ellipsis if needed
 */
export function truncateString(
  str: string | null | undefined,
  maxLength: number = 100
): string {
  if (!str) return "";
  
  if (str.length <= maxLength) return str;
  
  return str.substring(0, maxLength).trim() + "...";
}